import { z } from "zod";
import { getSession } from "@/lib/session";
import { describeError, generateQuiz } from "@/lib/claude";
import { TOPIC_IDS } from "@/lib/topics";

const str = z.string().max(300);
const Body = z.object({
  topic: z.enum(TOPIC_IDS),
  focus: z.string().max(200).default(""),
  recentMistakes: z.array(str).max(20).default([]),
  recentPrompts: z.array(str).max(30).default([]),
  weakSkills: z.array(str).max(10).default([]),
  recentPlaces: z.array(str).max(30).default([]),
  recentNews: z.array(z.string().max(500)).max(30).default([]),
});

export async function POST(request: Request) {
  if (!(await getSession())) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  try {
    return Response.json({ questions: await generateQuiz(parsed.data) });
  } catch (err) {
    console.error("quiz generation failed", err);
    const { status, message } = describeError(err);
    return Response.json({ error: message }, { status });
  }
}
