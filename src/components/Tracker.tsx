"use client";
import { levelFor } from "@/lib/scoring";
import { longestStreak, streak, today, type Progress } from "@/lib/progress";
import { t } from "./strings";

/** Streak, last 7 days, points and level. */
export default function Tracker({ progress }: { progress: Progress }) {
  const days = new Set(progress.days);
  const current = streak(progress.days);
  const level = levelFor(progress.points);
  const best = Math.max(progress.bestStreak, longestStreak(progress.days));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: today(d), label: t.weekdays[d.getDay()], isToday: i === 6 };
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold">🔥 {current > 0 ? t.streak(current) : t.noStreak}</div>
          {best > 1 && <div className="text-base text-muted">{t.best(best)}</div>}
        </div>
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
                aria-label={done ? "✓" : "—"}
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
            {level.emoji} {level.name}
          </span>
          <span className="text-lg font-bold">
            {progress.points} {t.points}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-good transition-all" style={{ width: `${level.pct}%` }} />
        </div>
        <div className="text-sm text-muted">
          {level.next ? t.toNext(level.next.min - progress.points, level.next.name) : t.maxLevel}
        </div>
      </div>
    </div>
  );
}
