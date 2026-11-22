import { z } from "zod";
import { getSession } from "@/lib/session";
import { describeError, EXAM_PARTS, generateExamPart } from "@/lib/claude";
import { LANGS } from "@/lib/topics";
import { log } from "@/lib/log";

const Body = z.object({
  level: z.number().int().min(1).max(10),
  lang: z.enum(LANGS).default("es"),
  part: z.number().int().min(0).max(EXAM_PARTS - 1),
  avoid: z.array(z.string().max(300)).max(100).default([]),
});

/** One batch of the level exam. The browser asks for all parts in the background. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    const questions = await generateExamPart({ ...parsed.data, user: session.name });
    log("exam.part.ok", { user: session.name, level: parsed.data.level, part: parsed.data.part, n: questions.length });
    return Response.json({ questions });
  } catch (err) {
    log("exam.part.error", { user: session.name, part: parsed.data.part, message: String(err) });
    const { status, message } = describeError(err, parsed.data.lang);
    return Response.json({ error: message }, { status });
  }
}
