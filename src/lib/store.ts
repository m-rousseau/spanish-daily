import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { log } from "./log";

/**
 * Per-user JSON documents. On Netlify: Netlify Blobs (durable, shared across
 * devices). In local dev, where Blobs isn't available: files in ./.data.
 */
type Backend = {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const fileBackend: Backend = {
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

let backend: Promise<Backend> | null = null;

async function pickBackend(): Promise<Backend> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "spanish-daily", consistency: "strong" });
    await store.get("__probe__"); // throws when the Netlify environment isn't present
    log("store.backend", { backend: "netlify-blobs" });
    return {
      get: (key) => store.get(key, { type: "json" }),
      set: async (key, value) => {
        await store.setJSON(key, value);
      },
    };
  } catch (err) {
    if (process.env.NETLIFY || process.env.NODE_ENV === "production") {
      log("store.backend.error", { message: err instanceof Error ? err.message : String(err) });
    }
    log("store.backend", { backend: "file", dir: DATA_DIR });
    return fileBackend;
  }
}

const getBackend = () => (backend ??= pickBackend());

export const DOCS = ["progress", "exam", "chat", "photos"] as const;
export type Doc = (typeof DOCS)[number];

const userKey = (user: string, doc: Doc) => `user/${user.trim().toLowerCase()}/${doc}`;

export async function readDoc(user: string, doc: Doc): Promise<unknown | null> {
  return (await getBackend()).get(userKey(user, doc));
}

export async function writeDoc(user: string, doc: Doc, value: unknown): Promise<void> {
  await (await getBackend()).set(userKey(user, doc), value);
}
