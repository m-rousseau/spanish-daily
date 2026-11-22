import { getSession } from "@/lib/session";
import { DOCS, readDoc, writeDoc, type Doc } from "@/lib/store";
import { log } from "@/lib/log";

// Max stored size per document (characters of JSON).
const LIMITS: Record<Doc, number> = { progress: 3_000_000, exam: 1_000_000, chat: 1_000_000, photos: 100_000 };

function docOf(param: string): Doc | null {
  return (DOCS as readonly string[]).includes(param) ? (param as Doc) : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ doc: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const doc = docOf((await ctx.params).doc);
  if (!doc) return Response.json({ error: "Unknown document" }, { status: 404 });
  try {
    const data = await readDoc(session.name, doc);
    return Response.json({ data });
  } catch (err) {
    log("state.read.error", { user: session.name, doc, message: String(err) });
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ doc: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const doc = docOf((await ctx.params).doc);
  if (!doc) return Response.json({ error: "Unknown document" }, { status: 404 });
  const text = await req.text();
  if (text.length > LIMITS[doc]) {
    log("state.write.too_large", { user: session.name, doc, chars: text.length });
    return Response.json({ error: "Too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Expected an object" }, { status: 400 });
  }
  try {
    // A device whose clock runs ahead must not lock out the others: cap future stamps at server time.
    const serverNow = Date.now();
    const b = body as { updatedAt?: unknown };
    if ((Number(b.updatedAt) || 0) > serverNow + 5000) b.updatedAt = serverNow;
    // Never let an older copy (stale tab, second device) overwrite a newer one.
    const incoming = Number(b.updatedAt) || 0;
    const current = (await readDoc(session.name, doc)) as { updatedAt?: unknown } | null;
    const stored = Number(current?.updatedAt) || 0;
    if (current && stored > incoming) {
      log("state.write.stale", { user: session.name, doc, incoming, stored });
      return Response.json({ error: "Stale", data: current }, { status: 409 });
    }
    await writeDoc(session.name, doc, body);
    log("state.write", { user: session.name, doc, chars: text.length });
    return Response.json({ ok: true });
  } catch (err) {
    log("state.write.error", { user: session.name, doc, message: String(err) });
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}
