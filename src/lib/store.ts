import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { log } from "./log";

/**
 * Per-user JSON documents. On Netlify: Netlify Blobs (durable, shared across
 * devices). In local dev, where Blobs isn't available: files in ./.data.
 */
type Backend = {
  name: string;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
};

const OP_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const DATA_DIR = path.join(process.cwd(), ".data");
const fileBackend: Backend = {
  name: "file",
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, `${encodeURIComponent(key)}.json`), "utf8"));
    } catch {
      return null;
    }
  },
  async set(key, value) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, `${encodeURIComponent(key)}.json`), JSON.stringify(value));
  },
};

const onNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.SITE_ID);

let backend: Promise<Backend> | null = null;

async function pickBackend(): Promise<Backend> {
  log("store.pick", { onNetlify: onNetlify(), hasBlobsContext: Boolean(process.env.NETLIFY_BLOBS_CONTEXT) });
  try {
    const { getStore } = await import("@netlify/blobs");
    // Default (eventual) consistency: the browser keeps a timestamped copy and
    // re-sends it if the server copy is ever older.
    // Next.js wraps global fetch for its data cache; give Blobs the original, uncached fetch.
    const g = globalThis as unknown as { _nextOriginalFetch?: typeof fetch };
    const rawFetch: typeof fetch = g._nextOriginalFetch ?? globalThis.fetch;
    const store = getStore({
      name: "spanish-daily",
      fetch: (input: RequestInfo | URL, init?: RequestInit) => rawFetch(input, { ...init, cache: "no-store" }),
    });
    await withTimeout(store.get("__probe__"), 4000, "blobs probe");
    log("store.backend", { backend: "netlify-blobs" });
    return {
      name: "netlify-blobs",
      get: (key) => store.get(key, { type: "json" }),
      set: async (key, value) => {
        await store.setJSON(key, value);
      },
    };
  } catch (err) {
    log(onNetlify() ? "store.backend.error" : "store.backend.local", {
      message: err instanceof Error ? err.message : String(err),
    });
    if (onNetlify()) throw err; // never silently fall back to a disk that disappears on Netlify
    log("store.backend", { backend: "file", dir: DATA_DIR });
    return fileBackend;
  }
}

async function getBackend(): Promise<Backend> {
  backend ??= pickBackend();
  try {
    return await backend;
  } catch (err) {
    backend = null; // retry the connection on the next request
    throw err;
  }
}

export const DOCS = ["progress", "exam", "chat", "photos"] as const;
export type Doc = (typeof DOCS)[number];

const userKey = (user: string, doc: Doc) => `user/${user.trim().toLowerCase()}/${doc}`;

export async function readDoc(user: string, doc: Doc): Promise<unknown | null> {
  const b = await getBackend();
  return withTimeout(b.get(userKey(user, doc)), OP_TIMEOUT_MS, `${b.name} read`);
}

export async function writeDoc(user: string, doc: Doc, value: unknown): Promise<void> {
  const b = await getBackend();
  await withTimeout(b.set(userKey(user, doc), value), OP_TIMEOUT_MS, `${b.name} write`);
}
