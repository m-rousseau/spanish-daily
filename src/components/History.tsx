"use client";
import { useState } from "react";
import Link from "next/link";
import { levelFor } from "@/lib/scoring";
import { loadProgress, longestStreak, today, weakSkills, type HistoryEntry } from "@/lib/progress";
import Header from "./Header";
import { verdictIcon } from "./QuestionCard";
import { t } from "./strings";

type Filter = "all" | "mistakes" | "fun";
const DAYS_PER_PAGE = 10;

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

// Rendered client-only (see PracticeLoader), so localStorage is safe in initializers.
export default function History({ name }: { name: string }) {
  const [progress] = useState(() => loadProgress(name));
  const [filter, setFilter] = useState<Filter>("all");
  const [pages, setPages] = useState(1);

  const h = progress.history;
  const level = levelFor(progress.points);
  const graded = h.filter((e) => e.type !== "geo" && e.type !== "news");
  const accuracy = graded.length
    ? Math.round((graded.reduce((s, e) => s + (e.verdict === "correct" ? 1 : e.verdict === "almost" ? 0.5 : 0), 0) / graded.length) * 100)
    : 0;
  const weak = weakSkills(h);

  const filtered = h.filter((e) =>
    filter === "mistakes" ? e.verdict !== "correct" : filter === "fun" ? e.type === "geo" || e.type === "news" : true,
  );
  const byDate = new Map<string, HistoryEntry[]>();
  for (const e of [...filtered].reverse()) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const dates = [...byDate.keys()];

  // Calendar: last 5 full weeks ending this week, Monday first.
  const practiced = new Set(progress.days);
  const end = new Date();
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7)); // move to Sunday
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (34 - i));
    const key = today(d);
    return { key, day: d.getDate(), done: practiced.has(key), future: d > new Date(), isToday: key === today() };
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Header active="history" />
      <h1 className="mb-4 text-3xl font-extrabold">{t.historyTitle}</h1>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.statPoints} value={String(progress.points)} />
        <Stat label={t.statLevel} value={`${level.emoji} ${level.name}`} />
        <Stat label={t.statDays} value={String(progress.days.length)} />
        <Stat label={t.statBest} value={`🔥 ${Math.max(progress.bestStreak, longestStreak(progress.days))}`} />
      </section>

      <section className="card mb-4 space-y-3">
        <h2 className="text-xl font-bold">{t.calendar}</h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} className="text-sm font-bold text-muted">
              {d}
            </div>
          ))}
          {cells.map((c) => (
            <div
              key={c.key}
              className={`flex aspect-square items-center justify-center rounded-xl text-base font-bold ${
                c.done ? "bg-accent text-white" : c.future ? "opacity-30" : "bg-border/60 text-muted"
              } ${c.isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`}
            >
              {c.day}
            </div>
          ))}
        </div>
        {graded.length > 0 && (
          <p className="text-base text-muted">
            {t.statAccuracy}: <strong className="text-foreground">{accuracy}%</strong>
          </p>
        )}
      </section>

      <section className="card mb-4 space-y-3">
        <h2 className="text-xl font-bold">🎯 {t.weakTitle}</h2>
        {weak.length === 0 ? (
          <p className="text-muted">{t.weakNone}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {weak.map((w) => (
                <li key={w.skill}>
                  <div className="flex justify-between gap-2 font-bold">
                    <span>{w.skill}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-warn" style={{ width: `${Math.round(w.accuracy * 100)}%` }} />
                  </div>
                  <div className="text-sm text-muted">{t.weakAccuracy(Math.round(w.accuracy * 100), w.attempts)}</div>
                </li>
              ))}
            </ul>
            <Link href="/?tema=weak" className="btn-primary w-full">
              🎯 {t.weakBtn}
            </Link>
          </>
        )}
      </section>

      <div className="mb-3 flex gap-2">
        {(
          [
            ["all", t.filterAll],
            ["mistakes", t.filterMistakes],
            ["fun", t.filterFun],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPages(1);
            }}
            aria-pressed={filter === f}
            className={`rounded-xl border-2 px-4 py-2 font-bold ${filter === f ? "border-accent bg-accent text-white" : "border-border bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {dates.length === 0 ? (
        <p className="card text-center text-muted">{t.empty}</p>
      ) : (
        <div className="space-y-5">
          {dates.slice(0, pages * DAYS_PER_PAGE).map((date) => {
            const entries = byDate.get(date)!;
            return (
              <section key={date}>
                <h3 className="mb-2 flex justify-between text-lg font-bold">
                  <span className="first-letter:uppercase">{formatDate(date)}</span>
                  <span className="text-base text-muted">
                    +{entries.reduce((s, e) => s + e.points, 0)} {t.points}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {entries.map((e) => (
                    <Entry key={e.ts} e={e} />
                  ))}
                </ul>
              </section>
            );
          })}
          {dates.length > pages * DAYS_PER_PAGE && (
            <button onClick={() => setPages(pages + 1)} className="btn-ghost w-full">
              {t.more}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}

function Entry({ e }: { e: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={open}>
        <span>{verdictIcon(e.verdict)}</span>
        <span className="flex-1">
          <span className="block text-sm text-muted">
            {e.type === "news" ? "📰 " : e.type === "geo" ? "🌎 " : ""}
            {e.skill}
          </span>
          <span className="font-semibold">{e.prompt}</span>
        </span>
        <span className="whitespace-nowrap text-sm font-bold text-muted">+{e.points}</span>
      </button>
      {open && (
        <div className="space-y-1 border-t border-border px-3 pb-3 pt-2 text-base">
          <p className="text-muted">{e.instruction}</p>
          <p>
            <span className="text-muted">{t.you}</span> {e.answer || "—"}
          </p>
          <p>
            <span className="text-muted">{t.answer}</span> <strong>{e.expected}</strong>
          </p>
          {e.feedback && <p className="opacity-80">{e.feedback}</p>}
          {e.link && (
            <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {t.readMore} ↗
            </a>
          )}
        </div>
      )}
    </li>
  );
}
