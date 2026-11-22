import { z } from "zod";
import { getSession } from "@/lib/session";
import { describeError, gradeAnswer } from "@/lib/claude";
import { LANGS } from "@/lib/topics";
import { log } from "@/lib/log";

const Body = z.object({
  level: z.number().int().min(1).max(10).default(2),
  lang: z.enum(LANGS).default("es"),
  question: z.object({
    type: z.enum(["open_text", "speaking", "listening"]),
    instruction: z.string().max(500),
    prompt: z.string().max(3000),
    spanish_audio: z.string().max(1000),
    expected_answer: z.string().max(1000),
  }),
  answer: z.string().max(500),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { lang } = parsed.data;
  if (!parsed.data.answer.trim()) {
    return Response.json({
      verdict: "incorrect",
      feedback: lang === "en" ? "No answer given." : "No hay respuesta.",
      corrected: parsed.data.question.expected_answer,
    });
  }
  try {
    const grade = await gradeAnswer({ ...parsed.data, user: session.name });
    log("grade.ok", { user: session.name, type: parsed.data.question.type, verdict: grade.verdict });
    return Response.json(grade);
  } catch (err) {
    log("grade.error", { user: session.name, message: String(err) });
    const { status, message } = describeError(err, lang);
    return Response.json({ error: message }, { status });
  }
}
