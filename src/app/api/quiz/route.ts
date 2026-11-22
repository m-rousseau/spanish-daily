import { z } from "zod";
import { getSession } from "@/lib/session";
import { describeError, generateQuiz } from "@/lib/claude";
import { LANGS, TOPIC_IDS } from "@/lib/topics";
import { log } from "@/lib/log";

const str = z.string().max(5000).transform((x) => x.slice(0, 300)); // trimmed: only used as hints to the model
const Body = z.object({
  topic: z.enum(TOPIC_IDS),
  level: z.number().int().min(1).max(10).default(2),
  lang: z.enum(LANGS).default("es"),
  focus: z.string().max(200).default(""),
  recentMistakes: z.array(str).max(20).default([]),
  recentPrompts: z.array(str).max(30).default([]),
  weakSkills: z.array(str).max(10).default([]),
  recentPlaces: z.array(str).max(30).default([]),
  recentNews: z.array(z.string().max(500)).max(30).default([]),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    log("quiz.bad_request", { user: session.name, issues: parsed.error.issues.length });
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const questions = await generateQuiz({ ...parsed.data, user: session.name });
    log("quiz.ok", { user: session.name, level: parsed.data.level, topic: parsed.data.topic, n: questions.length });
    return Response.json({ questions });
  } catch (err) {
    log("quiz.error", { user: session.name, message: String(err) });
    const { status, message } = describeError(err, parsed.data.lang);
    return Response.json({ error: message }, { status });
  }
}
