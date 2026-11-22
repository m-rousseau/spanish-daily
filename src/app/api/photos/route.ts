import { getSession } from "@/lib/session";
import { driveConfigured, listPhotos } from "@/lib/drive";
import { log } from "@/lib/log";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  if (!driveConfigured()) return Response.json({ configured: false, photos: [] });
  try {
    return Response.json({ configured: true, photos: await listPhotos() });
  } catch (err) {
    log("photos.error", { user: session.name, message: String(err) });
    return Response.json({ configured: true, photos: [], error: "Couldn't load photos" }, { status: 502 });
  }
}
