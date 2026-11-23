import { getSession } from "@/lib/session";
import { driveConfigured, photoImage } from "@/lib/drive";
import { icloudConfigured, icloudImage, isICloudId } from "@/lib/icloud";
import { log } from "@/lib/log";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Not logged in", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return new Response("Bad id", { status: 400 });
  const icloud = isICloudId(id);
  if (icloud ? !icloudConfigured() : !driveConfigured()) return new Response("Not configured", { status: 404 });
  const size = new URL(req.url).searchParams.get("size") === "large" ? "large" : "thumb";
  try {
    const img = icloud ? await icloudImage(id, size) : await photoImage(id, size);
    if (!img) return new Response("Not found", { status: 404 });
    return new Response(img.body, {
      headers: {
        "content-type": img.type,
        // Private to her browser; never cached by shared caches.
        "cache-control": "private, max-age=86400",
      },
    });
  } catch (err) {
    log("photos.image.error", { user: session.name, id, message: String(err) });
    return new Response("Error", { status: 502 });
  }
}
