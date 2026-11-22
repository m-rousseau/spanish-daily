import { z } from "zod";
import { getSession } from "@/lib/session";
import { chatReply, describeError } from "@/lib/claude";
import { LANGS } from "@/lib/topics";
import { trimForChat } from "@/lib/trim";
import { log } from "@/lib/log";

const Body = z.object({
  level: z.number().int().min(1).max(10).default(2),
  lang: z.enum(LANGS).default("es"),
  profile: z.string().max(20_000).default(""),
  current: z.string().max(20_000).default(""),
  history: z.array(z.string().max(2_000)).max(5_000).default([]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8_000) }))
    .min(1)
    .max(600),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") return Response.json({ error: "Last message must be hers" }, { status: 400 });

  // Enforced here regardless of what the browser sends: at most 90,000 characters of context.
  const trimmed = trimForChat(parsed.data);
  try {
    const reply = await chatReply({
      user: session.name,
      level: parsed.data.level,
      lang: parsed.data.lang,
      context: trimmed.context,
      messages: trimmed.messages,
    });
    log("chat.ok", {
      user: session.name,
      chars: trimmed.chars,
      historyKept: trimmed.historyKept,
      historySent: parsed.data.history.length,
      messagesKept: trimmed.messagesKept,
      messagesSent: messages.length,
    });
    return Response.json({ reply, usedChars: trimmed.chars });
  } catch (err) {
    log("chat.error", { user: session.name, message: String(err) });
    const { status, message } = describeError(err, parsed.data.lang);
    return Response.json({ error: message }, { status });
  }
}
