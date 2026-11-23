import { getSession } from "@/lib/session";
import { driveConfigured, listPhotos, type Photo } from "@/lib/drive";
import { icloudConfigured, listICloudPhotos } from "@/lib/icloud";
import { log } from "@/lib/log";

/** Photos from the iCloud shared album and the Drive folder, newest first. One failing source doesn't hide the other. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const sources: { name: string; load: () => Promise<Photo[]> }[] = [];
  if (icloudConfigured()) sources.push({ name: "icloud", load: () => listICloudPhotos() });
  if (driveConfigured()) sources.push({ name: "drive", load: () => listPhotos() });
  if (!sources.length) return Response.json({ configured: false, photos: [] });

  const results = await Promise.allSettled(sources.map((s) => s.load()));
  const photos: Photo[] = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") photos.push(...r.value);
    else {
      failed++;
      log(`photos.${sources[i].name}.error`, { user: session.name, message: String(r.reason) });
    }
  });
  photos.sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1));
  if (failed === sources.length) {
    return Response.json({ configured: true, photos: [], error: "Couldn't load photos" }, { status: 502 });
  }
  return Response.json({ configured: true, photos });
}
