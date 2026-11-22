"use client";
import { useState } from "react";
import Link from "next/link";
import { DAYS_TO_GRADUATE, LEVELS, levelInfo } from "@/lib/topics";
import { examReady, hasGraduated, levelStat, type Progress } from "@/lib/progress";
import { useLang } from "./LangProvider";

/** Current level, progress toward the 10 days, the level picker and the way to the exam. */
export default function LevelCard({ progress, onSetLevel }: { progress: Progress; onSetLevel: (n: number) => void }) {
  const { t, lang } = useLang();
  const [picking, setPicking] = useState(false);
  const L = levelInfo(progress.level);
  const days = levelStat(progress, L.n).days.length;
  const ready = examReady(progress, L.n);

  return (
    <div className="card space-y-3">
      {ready && (
        <div className="rounded-2xl bg-good-soft p-3 text-good" role="status">
          <p className="font-bold">{t.readyBanner(L.n)}</p>
          <Link href="/examen" className="btn-primary mt-2 w-full">
            🎓 {t.takeExam}
          </Link>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-muted">{t.levelOf(L.n, L.cefr)}</div>
          <div className="text-2xl font-extrabold">{L.name[lang]}</div>
          <div className="text-base text-muted">{L.summary[lang]}</div>
        </div>
        <button onClick={() => setPicking(!picking)} className="btn-ghost shrink-0 px-3 py-2 text-base" aria-expanded={picking}>
          {t.changeLevel}
        </button>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm font-bold">
          <span>{t.daysAtLevel(Math.min(days, DAYS_TO_GRADUATE), DAYS_TO_GRADUATE)}</span>
          {hasGraduated(progress, L.n) && <span className="text-good">{t.graduated}</span>}
        </div>
        <div className="grid grid-cols-10 gap-1" aria-label={t.daysAtLevel(days, DAYS_TO_GRADUATE)}>
          {Array.from({ length: DAYS_TO_GRADUATE }, (_, i) => (
            <div key={i} className={`h-3 rounded-full ${i < days ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
      </div>
      {!ready && (
        <Link href="/examen" className="block text-center text-base text-muted underline">
          {t.wantGraduate}
        </Link>
      )}

      {picking && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="font-bold">{t.chooseLevel}</p>
          <p className="text-sm text-muted">{t.chooseLevelHint}</p>
          <div className="grid gap-2">
            {LEVELS.map((lv) => {
              const on = lv.n === progress.level;
              return (
                <button
                  key={lv.n}
                  onClick={() => {
                    onSetLevel(lv.n);
                    setPicking(false);
                  }}
                  aria-pressed={on}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-3 text-left ${
                    on ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-accent"
                  }`}
                >
                  <span className="w-9 shrink-0 text-center text-2xl font-extrabold">{lv.n}</span>
                  <span className="flex-1">
                    <span className="block font-bold">
                      {lv.name[lang]} <span className="text-sm font-semibold text-muted">· {lv.cefr}</span>
                      {hasGraduated(progress, lv.n) && <span className="ml-2 text-sm text-good">🎓</span>}
                      {on && <span className="ml-2 text-sm text-accent">({t.current})</span>}
                    </span>
                    <span className="block text-sm text-muted">{lv.summary[lang]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
