import "server-only";
import { log } from "./log";
import type { Photo } from "./drive";

/**
 * Reads photos from an iCloud Shared Album that is set to "Anyone with the Link".
 * Marc adds photos to the album from his iPhone; they show up here within minutes.
 *
 * Env: ICLOUD_ALBUM_URL (https://photos.icloud.com/shared/album/<key>, or just the key).
 *
 * This uses the same CloudKit requests the public album web page makes for an anonymous
 * visitor. Apple does not document them, so if Apple changes the page this may stop
 * working: failures are logged ("icloud.error") and the Drive photos keep working.
 */

const CONTAINER = "com.apple.photos.cloud";
const CK = "https://ckdatabasews.icloud.com";
const HEADERS = { "content-type": "text/plain", origin: "https://photos.icloud.com" };
const CACHE_MS = 2 * 60 * 1000; // new photos show up within 2 minutes
const TIMEOUT = 10_000;

const rawFetch: typeof fetch =
  (globalThis as unknown as { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? fetch;

export function icloudConfigured() {
  return Boolean(albumKey());
}

function albumKey(): string {
  const v = (process.env.ICLOUD_ALBUM_URL ?? "").trim();
  const m = v.match(/shared\/album\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : /^[A-Za-z0-9_-]{10,}$/.test(v) ? v : "";
}

type CKRecord = {
  recordName: string;
  recordType: string;
  deleted?: boolean;
  created?: { timestamp?: number }; // when the record was added to the shared album
  fields: Record<string, { value: unknown; type?: string } | undefined>;
};
type Res = { downloadURL?: string; size?: number };
type Links = { thumb: string; large: string };

let cache: { at: number; photos: Photo[]; links: Map<string, Links> } | null = null;
let inflight: Promise<Photo[]> | null = null;

async function post(url: string, body: unknown) {
  const res = await rawFetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`iCloud ${new URL(url).pathname.split("/").slice(-2).join("/")}: ${res.status}`);
  return data;
}

/** Album id for our URLs: "ic-" + the record name in URL-safe form. */
const photoId = (recordName: string) => "ic-" + Buffer.from(recordName).toString("base64url");

async function fetchAlbum(): Promise<Photo[]> {
  const started = Date.now();
  const key = albumKey();
  const resolved = await post(`${CK}/database/1/${CONTAINER}/production/public/records/resolve?remapEnums=true`, {
    shortGUIDs: [{ value: key }],
  });
  const r = resolved?.results?.[0];
  const access = r?.anonymousPublicAccess;
  if (!access?.token || !access?.databasePartition || !r?.zoneID) {
    throw new Error("iCloud album not public or not found (check that it is set to Anyone with the Link)");
  }
  const base = String(access.databasePartition).replace(/:443$/, "");
  const query = `${base}/database/1/${CONTAINER}/production/shared/records/query?remapEnums=true&publicAccessAuthToken=${encodeURIComponent(access.token)}`;

  const assets: CKRecord[] = [];
  const masters = new Map<string, CKRecord>();
  let rank = 0;
  // Each asset comes back as a pair (CPLAsset + CPLMaster); page through by rank.
  for (let page = 0; page < 50; page++) {
    const data = await post(query, {
      query: {
        recordType: "CPLAssetAndMasterByAddedDate",
        filterBy: [
          { fieldName: "direction", comparator: "EQUALS", fieldValue: { value: "ASCENDING", type: "STRING" } },
          { fieldName: "startRank", comparator: "EQUALS", fieldValue: { value: rank, type: "INT64" } },
        ],
      },
      zoneID: r.zoneID,
      resultsLimit: 200,
    });
    const records: CKRecord[] = Array.isArray(data.records) ? data.records : [];
    let newAssets = 0;
    for (const rec of records) {
      if (rec.deleted) continue;
      if (rec.recordType === "CPLMaster") masters.set(rec.recordName, rec);
      if (rec.recordType === "CPLAsset") {
        assets.push(rec);
        newAssets++;
      }
    }
    if (newAssets === 0 || records.length < 200) break;
    rank += newAssets;
  }

  const links = new Map<string, Links>();
  const photos: Photo[] = [];
  for (const a of assets) {
    const masterName = (a.fields.masterRef?.value as { recordName?: string } | undefined)?.recordName;
    const m = masterName ? masters.get(masterName) : undefined;
    if (!m) continue;
    const f = m.fields;
    const res = (k: string) => (f[k]?.value as Res | undefined)?.downloadURL?.replace("${f}", "photo.jpg");
    // JPEG versions Apple renders for every photo (originals may be HEIC, which browsers can't show).
    const large = res("resJPEGFullRes") ?? res("resJPEGMedRes");
    const thumb = res("resJPEGThumbRes") ?? large;
    if (!large || !thumb) continue; // videos and items still processing
    const id = photoId(m.recordName);
    links.set(id, { thumb, large });
    // When it was put in the shared album (so photos added today count as new for her).
    const added = Number(a.created?.timestamp) || Number(a.fields.addedDate?.value) || started;
    const taken = Number(a.fields.assetDate?.value);
    photos.push({
      id,
      name: "",
      createdTime: new Date(added).toISOString(),
      takenTime: taken ? new Date(taken).toISOString() : null,
      width: Number(f.resJPEGMedWidth?.value ?? f.resOriginalWidth?.value) || 0,
      height: Number(f.resJPEGMedHeight?.value ?? f.resOriginalHeight?.value) || 0,
    });
  }
  photos.sort((x, y) => (x.createdTime < y.createdTime ? 1 : -1));
  cache = { at: Date.now(), photos, links };
  log("icloud.list", { count: photos.length, ms: Date.now() - started });
  return photos;
}

/** Newest first. Cached for 2 minutes; concurrent callers share one request. */
export async function listICloudPhotos(force = false): Promise<Photo[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.photos;
  if (!inflight) inflight = fetchAlbum().finally(() => (inflight = null));
  return inflight;
}

export const isICloudId = (id: string) => id.startsWith("ic-");

/** JPEG bytes for one photo in the album; null if it isn't in the album. */
export async function icloudImage(id: string, size: "thumb" | "large"): Promise<{ body: ArrayBuffer; type: string } | null> {
  let link = cache?.links.get(id);
  if (!link && Date.now() - (cache?.at ?? 0) > 30_000) {
    await listICloudPhotos(true);
    link = cache?.links.get(id);
  }
  if (!link) return null;
  const get = (l: Links) =>
    rawFetch(size === "thumb" ? l.thumb : l.large, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  let res = await get(link);
  if (!res.ok) {
    // Download links are signed and expire: refresh the listing once and retry.
    await listICloudPhotos(true);
    const fresh = cache?.links.get(id);
    if (!fresh) return null;
    res = await get(fresh);
  }
  if (!res.ok) throw new Error(`iCloud image: ${res.status}`);
  return { body: await res.arrayBuffer(), type: res.headers.get("content-type")?.startsWith("image/") ? res.headers.get("content-type")! : "image/jpeg" };
}
