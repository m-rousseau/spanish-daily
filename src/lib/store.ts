import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { log } from "./log";

/**
 * Per-user JSON documents.
 * - On Netlify: Netlify Blobs, via direct requests to the Blobs edge using the
 *   credentials Netlify provides at runtime (the @netlify/blobs client hangs
 *   inside the Next.js runtime, so we talk to the edge ourselves).
 * - In local dev: files in ./.data.
 */
type Backend = {
  name: string;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
};

const STORE = "spanish-daily";
const TIMEOUT_MS = 8000;

type BlobsContext = { edgeURL: string; uncachedEdgeURL?: string; siteID: string; token: string };

function blobsContext(): BlobsContext | null {
  const raw = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!raw) return null;
  try {
    const ctx = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return ctx.edgeURL && ctx.siteID && ctx.token ? ctx : null;
  } catch {
    return null;
  }
}

// Next.js wraps global fetch for its data cache; use the original.
const rawFetch: typeof fetch =
  (globalThis as unknown as { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? fetch;

function blobURL(ctx: BlobsContext, key: string, fresh = false) {
  // The uncached edge always returns the latest write (the cached one can lag up to a minute).
  const base = fresh && ctx.uncachedEdgeURL ? ctx.uncachedEdgeURL : ctx.edgeURL;
  return new URL(`/${ctx.siteID}/site:${STORE}/${encodeURIComponent(key)}`, base);
}

const blobsBackend: Backend = {
  name: "netlify-blobs",
  async get(key) {
    const ctx = blobsContext();
    if (!ctx) throw new Error("Netlify Blobs context missing");
    const res = await rawFetch(blobURL(ctx, key, true), {
      headers: { authorization: `Bearer ${ctx.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Blobs read failed: ${res.status}`);
    return res.json();
  },
  async set(key, value) {
    const ctx = blobsContext();
    if (!ctx) throw new Error("Netlify Blobs context missing");
    const res = await rawFetch(blobURL(ctx, key), {
      method: "PUT",
      headers: { authorization: `Bearer ${ctx.token}`, "content-type": "application/json" },
      body: JSON.stringify(value),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Blobs write failed: ${res.status} ${(await res.text()).slice(0, 120)}`);
  },
};

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
    // Write to a temp file, then rename: a reader never sees a half-written file.
    const file = path.join(DATA_DIR, `${encodeURIComponent(key)}.json`);
    const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value));
    await fs.rename(tmp, file);
  },
};

const onNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.SITE_ID);

function backend(): Backend {
  if (blobsContext()) return blobsBackend;
  if (onNetlify()) throw new Error("Running on Netlify but no Blobs context is available");
  return fileBackend; // never silently fall back to disk on Netlify, where it would vanish
}

export const DOCS = ["progress", "exam", "chat", "photos"] as const;
export type Doc = (typeof DOCS)[number];

const userKey = (user: string, doc: Doc) => `user/${user.trim().toLowerCase()}/${doc}`;

export async function readDoc(user: string, doc: Doc): Promise<unknown | null> {
  const b = backend();
  const started = Date.now();
  const data = await b.get(userKey(user, doc));
  log("store.read", { backend: b.name, user, doc, found: data !== null, ms: Date.now() - started });
  return data;
}

export async function writeDoc(user: string, doc: Doc, value: unknown): Promise<void> {
  const b = backend();
  const started = Date.now();
  await b.set(userKey(user, doc), value);
  log("store.write", { backend: b.name, user, doc, ms: Date.now() - started });
}
