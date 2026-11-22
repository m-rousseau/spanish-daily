import "server-only";
import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";
import { log } from "./log";
import { parseServiceAccount } from "./saKey";

/**
 * Reads photos from one private Google Drive folder through a service account.
 * The folder is shared (Viewer) with the service account's email; nothing is public.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY (the "private_key"
 * from the JSON key file), GOOGLE_DRIVE_FOLDER_ID (from the folder's URL).
 */

export type Photo = { id: string; name: string; createdTime: string; takenTime: string | null; width: number; height: number };

const rawFetch: typeof fetch =
  (globalThis as unknown as { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? fetch;

/** The key: GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to the downloaded JSON key) or GOOGLE_SERVICE_ACCOUNT_KEY. */
function keySource(): string {
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (file) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      return "";
    }
  }
  return process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "";
}

export function driveConfigured() {
  const key = keySource();
  return Boolean(key && folderId() && (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || key.includes("client_email")));
}

/** Accepts the bare folder ID or a pasted folder URL. */
function folderId(): string {
  const v = (process.env.GOOGLE_DRIVE_FOLDER_ID ?? "").trim();
  const m = v.match(/folders\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : v;
}

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const parsed = parseServiceAccount(keySource(), process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "");
  if ("error" in parsed) {
    log("photos.key_shape", parsed.shape);
    throw new Error(parsed.error);
  }
  const { email, pem } = parsed;
  const key = await importPKCS8(pem, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/drive.readonly" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await rawFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${res.status} ${data.error ?? ""} ${data.error_description ?? ""}`);
  token = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return token.value;
}

type DriveFile = {
  id: string;
  name: string;
  createdTime: string;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number; time?: string };
};

let cache: { at: number; photos: Photo[]; thumbs: Map<string, string> } | null = null;
const CACHE_MS = 5 * 60 * 1000; // new photos show up within 5 minutes

/** Newest first. Cached for a few minutes. */
export async function listPhotos(force = false): Promise<Photo[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.photos;
  const started = Date.now();
  const t = await accessToken();
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `'${folderId()}' in parents and mimeType contains 'image/' and trashed = false`);
    url.searchParams.set("orderBy", "createdTime desc");
    url.searchParams.set("pageSize", "200");
    url.searchParams.set("fields", "nextPageToken, files(id, name, createdTime, thumbnailLink, imageMediaMetadata(width, height, time))");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await rawFetch(url, { headers: { authorization: `Bearer ${t}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!res.ok) throw new Error(`Drive list error: ${res.status} ${data.error?.message ?? ""}`);
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken && files.length < 1000);

  const thumbs = new Map<string, string>();
  const photos = files.map((f) => {
    if (f.thumbnailLink) thumbs.set(f.id, f.thumbnailLink);
    const m = f.imageMediaMetadata ?? {};
    return {
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      takenTime: m.time ? m.time.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3") : null,
      width: m.width ?? 0,
      height: m.height ?? 0,
    };
  });
  cache = { at: Date.now(), photos, thumbs };
  log("photos.list", { count: photos.length, ms: Date.now() - started });
  return photos;
}

/**
 * Image bytes for one photo in the folder, resized by Google (stays well under
 * hosting response limits). Only IDs from the folder listing are served.
 */
export async function photoImage(id: string, size: "thumb" | "large"): Promise<{ body: ArrayBuffer; type: string } | null> {
  let link = cache?.thumbs.get(id);
  if (!link) {
    await listPhotos(true);
    link = cache?.thumbs.get(id);
  }
  if (!link) return null; // not in the folder (or no preview available yet)
  const sized = link.replace(/=s\d+$/, "") + (size === "thumb" ? "=s600" : "=s2000");
  const t = await accessToken();
  let res = await rawFetch(sized, { headers: { authorization: `Bearer ${t}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (res.status === 403 || res.status === 404) {
    // Preview links expire after a few hours: refresh the listing once and retry.
    await listPhotos(true);
    const fresh = cache?.thumbs.get(id);
    if (!fresh) return null;
    res = await rawFetch(fresh.replace(/=s\d+$/, "") + (size === "thumb" ? "=s600" : "=s2000"), {
      headers: { authorization: `Bearer ${t}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  }
  if (!res.ok) throw new Error(`Drive image error: ${res.status}`);
  return { body: await res.arrayBuffer(), type: res.headers.get("content-type") ?? "image/jpeg" };
}
