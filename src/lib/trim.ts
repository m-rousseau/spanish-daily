// Fits the tutor's context into a fixed character budget, keeping what matters most.

export const CHAT_CONTEXT_BUDGET = 90_000; // characters: profile + current question + history + chat
export type ChatMsg = { role: "user" | "assistant"; content: string };

export type TrimInput = {
  profile: string; // always kept (small)
  current: string; // question on screen, always kept (small)
  history: string[]; // oldest first
  messages: ChatMsg[]; // oldest first; the last one is her new message
};

export type Trimmed = { context: string; messages: ChatMsg[]; chars: number; historyKept: number; messagesKept: number };

/**
 * Keeps the newest material: profile and current question always, then the
 * newest chat messages (up to half the budget), then the newest history lines
 * until the total reaches the budget.
 */
export function trimForChat(input: TrimInput, budget = CHAT_CONTEXT_BUDGET): Trimmed {
  const profile = input.profile.slice(0, 4000);
  const current = input.current.slice(0, 6000);
  let remaining = budget - profile.length - current.length;

  // Newest messages first, up to half of what's left (the newest one is always kept).
  const msgBudget = Math.floor(remaining / 2);
  const kept: ChatMsg[] = [];
  let used = 0;
  for (let i = input.messages.length - 1; i >= 0; i--) {
    const m = input.messages[i];
    if (kept.length > 0 && used + m.content.length > msgBudget) break;
    kept.unshift(m);
    used += m.content.length;
  }
  // The API requires the conversation to start with a user turn.
  while (kept.length && kept[0].role !== "user") {
    used -= kept[0].content.length;
    kept.shift();
  }
  remaining -= used;
  // Merge back-to-back messages from the same side (e.g. she sent twice without a reply).
  const merged: ChatMsg[] = [];
  for (const m of kept) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }

  const lines: string[] = [];
  for (let i = input.history.length - 1; i >= 0; i--) {
    const line = input.history[i];
    if (line.length + 1 > remaining) break;
    lines.unshift(line);
    remaining -= line.length + 1;
  }

  const context = [
    "## Learner profile",
    profile,
    "## On her screen right now",
    current || "(nothing: she isn't answering a question right now)",
    `## Her practice history (newest last; ${lines.length} of ${input.history.length} entries shown)`,
    lines.join("\n"),
  ].join("\n");
  return {
    context,
    messages: merged,
    chars: profile.length + current.length + used + lines.reduce((s, l) => s + l.length + 1, 0),
    historyKept: lines.length,
    messagesKept: merged.length,
  };
}
