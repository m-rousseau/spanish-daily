"use client";
import { rankFor } from "@/lib/scoring";
import { longestStreak, streak, today, type Progress } from "@/lib/progress";
import { useLang } from "./LangProvider";

/** Streak, last 7 days, points and rank. */
export default function Tracker({ progress }: { progress: Progress }) {
  const { t, lang } = useLang();
  const days = new Set(progress.days);
  const current = streak(progress.days);
  const rank = rankFor(progress.points);
  const best = Math.max(progress.bestStreak, longestStreak(progress.days));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: today(d), label: t.weekdays[d.getDay()], isToday: i === 6 };
  });

  return (
    <div className="card space-y-4">
      <div>
        <div className="text-3xl font-extrabold">🔥 {current > 0 ? t.streak(current) : t.noStreak}</div>
        {best > 1 && <div className="text-base text-muted">{t.best(best)}</div>}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {week.map((d) => {
          const done = days.has(d.key);
          return (
            <div key={d.key} className="space-y-1">
              <div className={`text-sm font-bold ${d.isToday ? "text-accent" : "text-muted"}`}>{d.label}</div>
              <div
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                  done ? "bg-accent text-white" : d.isToday ? "border-2 border-dashed border-accent" : "bg-border/60"
                }`}
              >
                {done ? "✓" : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-extrabold">
            {rank.emoji} {rank.name[lang]}
          </span>
          <span className="text-lg font-bold" data-testid="points">
            {progress.points} {t.points}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-good transition-all" style={{ width: `${rank.pct}%` }} />
        </div>
        <div className="text-sm text-muted">
          {rank.next ? t.toNext(rank.next.min - progress.points, rank.next.name[lang]) : t.maxRank}
        </div>
      </div>
    </div>
  );
}
