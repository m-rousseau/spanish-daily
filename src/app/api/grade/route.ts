import { z } from "zod";
import { getSession } from "@/lib/session";
import { describeError, gradeAnswer } from "@/lib/claude";

const Body = z.object({
  question: z.object({
    type: z.enum(["open_text", "speaking", "listening"]),
    instruction: z.string().max(500),
    prompt: z.string().max(1000),
    spanish_audio: z.string().max(1000),
    expected_answer: z.string().max(1000),
  }),
  answer: z.string().max(500),
});

export async function POST(request: Request) {
  if (!(await getSession())) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  if (!parsed.data.answer.trim()) {
    return Response.json({
      verdict: "incorrect",
      feedback: "No hay respuesta.",
      corrected: parsed.data.question.expected_answer,
    });
  }
  try {
    return Response.json(await gradeAnswer(parsed.data));
  } catch (err) {
    console.error("grading failed", err);
    const { status, message } = describeError(err);
    return Response.json({ error: message }, { status });
  }
}
