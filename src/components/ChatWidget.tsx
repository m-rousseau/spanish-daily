"use client";
import { goToLogin } from "@/lib/nav";
import { useEffect, useRef, useState } from "react";
import { levelInfo } from "@/lib/topics";
import { levelStat, longestStreak, streak, weakSkills, type Progress } from "@/lib/progress";
import { loadDoc, readCache, saveDoc } from "@/lib/sync";
import { useScreen } from "@/lib/screen";
import { badgeById } from "@/lib/badges";
import { useLang } from "./LangProvider";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type ChatDoc = { updatedAt?: number; messages: Msg[] };

const MAX_STORED = 400; // messages kept on the server
const MAX_SENT_HISTORY = 900; // history lines sent; the server trims everything to 90k characters

function profileText(name: string, p: Progress, lang: string) {
  const L = levelInfo(p.level);
  const stat = levelStat(p, p.level);
  return [
    `Name: ${name}`,
    `Level: ${L.n}/10 (${L.cefr}, ${L.name.en}); ${stat.days.length} practice days at this level; ${stat.answered} questions answered at this level`,
    `Points: ${p.points}; current streak: ${streak(p.days)} days; best streak: ${Math.max(p.bestStreak, longestStreak(p.days))}; total days practiced: ${p.days.length}`,
    `Weakest skills: ${weakSkills(p.history).map((w) => `${w.skill} (${Math.round(w.accuracy * 100)}%)`).join(", ") || "none yet"}`,
    `Exams: ${p.exams.map((e) => `level ${e.level} on ${e.date}: ${e.score}% ${e.passed ? "passed" : "not passed"}`).join("; ") || "none yet"}`,
    `Achievements: ${p.badges.map((b) => badgeById(b)?.name.en ?? b).join(", ") || "none yet"}`,
    `Interface language: ${lang === "en" ? "English" : "Spanish"}`,
  ].join("\n");
}

function historyLines(p: Progress): string[] {
  return p.history.slice(-MAX_SENT_HISTORY).map(
    (e) =>
      `${e.date} L${e.level ?? "?"}${e.exam ? " EXAM" : ""} [${e.type}/${e.skill}] ${e.prompt} → her answer: «${e.answer}» (${e.verdict}); correct: «${e.expected}»`,
  );
}

/** Floating tutor, available on every page. Remembers the conversation across sessions and devices. */
export default function ChatWidget({ name, progress }: { name: string; progress: Progress }) {
  const { t, lang } = useLang();
  const screen = useScreen();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => readCache<ChatDoc>("chat", name)?.messages ?? []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadDoc<ChatDoc>("chat", name).then((doc) => {
      if (alive && doc?.messages) setMessages(doc.messages);
    });
    return () => {
      alive = false;
    };
  }, [name]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages, sending]);

  function persist(next: Msg[]) {
    const kept = next.slice(-MAX_STORED);
    setMessages(kept);
    saveDoc<ChatDoc>("chat", name, { messages: kept });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const withMine = [...messages, { role: "user" as const, content: text.slice(0, 8000), ts: Date.now() }];
    persist(withMine);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: progress.level,
          lang,
          profile: profileText(name, progress, lang),
          current: screen ? `${screen.label}\n${screen.text}` : "",
          history: historyLines(progress),
          messages: withMine.slice(-200).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (res.status === 401) {
        goToLogin();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      persist([...withMine, { role: "assistant", content: data.reply, ts: Date.now() }]);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.chatError);
    } finally {
      setSending(false);
    }
  }

  function clear() {
    if (window.confirm(t.chatClearConfirm)) persist([]);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-accent px-5 py-3 text-lg font-bold text-white shadow-lg hover:brightness-110"
        aria-label={t.chatTitle}
      >
        {t.chatOpen}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-card sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[600px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl"
      role="dialog"
      aria-label={t.chatTitle}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <strong className="text-lg">💬 {t.chatTitle}</strong>
        <div className="flex items-center gap-2">
          <button onClick={clear} className="text-sm text-muted underline">
            {t.chatClear}
          </button>
          <button onClick={() => setOpen(false)} className="rounded-xl px-2 text-2xl leading-none" aria-label={t.close}>
            ×
          </button>
        </div>
      </div>
      {screen && <div className="border-b border-border bg-accent-soft px-4 py-2 text-sm">{t.chatSeeing(screen.label)}</div>}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && <p className="rounded-2xl bg-background p-3 text-base">{t.chatWelcome}</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-base ${
              m.role === "user" ? "ml-auto bg-accent text-white" : "bg-background"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <div className="w-16 animate-pulse rounded-2xl bg-background px-3 py-2">…</div>}
        {error && <p className="text-bad">{error}</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chatPlaceholder}
          maxLength={8000}
          className="input flex-1 py-2 text-lg"
          aria-label={t.chatPlaceholder}
        />
        <button disabled={!input.trim() || sending} className="btn-primary px-4">
          {t.chatSend}
        </button>
      </form>
    </div>
  );
}
