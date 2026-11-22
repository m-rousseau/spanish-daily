"use client";
// Progress lives in this browser's localStorage (one copy per device).
import type { QuestionType, Verdict } from "./types";

export type HistoryEntry = {
  ts: number;
  date: string; // local YYYY-MM-DD
  topic: string;
  type: QuestionType;
  skill: string;
  instruction: string;
  prompt: string;
  answer: string;
  expected: string;
  verdict: Verdict;
  points: number;
  feedback: string;
  link?: string; // news article
};

export type Progress = {
  days: string[]; // dates practiced, YYYY-MM-DD
  points: number;
  bestStreak: number;
  history: HistoryEntry[];
};

const MAX_HISTORY = 4000; // ~a year and a half of daily rounds; keeps localStorage well under its limit
const key = (name: string) => `sd_progress_v2:${name.toLowerCase()}`;
const empty = (): Progress => ({ days: [], points: 0, bestStreak: 0, history: [] });

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function loadProgress(name: string): Progress {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw) return { ...empty(), ...JSON.parse(raw) };
    // Carry practiced days over from the first version of the app.
    const v1 = localStorage.getItem(`sd_progress_v1:${name.toLowerCase()}`);
    if (v1) {
      const days: string[] = JSON.parse(v1).days ?? [];
      return { ...empty(), days, bestStreak: longestStreak(days) };
    }
  } catch {}
  return empty();
}

function save(name: string, p: Progress) {
  try {
    localStorage.setItem(key(name), JSON.stringify(p));
  } catch {}
}

/** Current run of consecutive days, counting today if done, else up to yesterday. */
export function streak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Longest run of consecutive practiced days ever. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const next = prev ? new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1) : null;
    run = next && today(next) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Saves a finished round. Returns the new progress and any daily bonus awarded. */
export function recordRound(
  name: string,
  entries: Omit<HistoryEntry, "ts" | "date">[],
  bonusFor: (streakDays: number) => number,
): { progress: Progress; bonus: number } {
  const p = loadProgress(name);
  const t = today();
  const firstToday = !p.days.includes(t);
  if (firstToday) p.days = [...p.days, t];
  const s = streak(p.days);
  const bonus = firstToday ? bonusFor(s) : 0;
  const now = Date.now();
  p.history = [...p.history, ...entries.map((e, i) => ({ ...e, ts: now + i, date: t }))].slice(-MAX_HISTORY);
  p.points += entries.reduce((sum, e) => sum + e.points, 0) + bonus;
  p.bestStreak = Math.max(p.bestStreak, s, longestStreak(p.days));
  save(name, p);
  return { progress: p, bonus };
}

const isFun = (e: HistoryEntry) => e.type === "geo" || e.type === "news";

/** Skills with the lowest accuracy (at least 2 attempts, under 80%). */
export function weakSkills(history: HistoryEntry[], limit = 5) {
  const stats = new Map<string, { label: string; n: number; score: number }>();
  for (const e of history.slice(-600)) {
    if (isFun(e) || !e.skill) continue;
    const k = e.skill.trim().toLowerCase();
    const s = stats.get(k) ?? { label: e.skill.trim(), n: 0, score: 0 };
    s.n++;
    s.score += e.verdict === "correct" ? 1 : e.verdict === "almost" ? 0.5 : 0;
    stats.set(k, s);
  }
  return [...stats.values()]
    .filter((s) => s.n >= 2 && s.score / s.n < 0.8)
    .map((s) => ({ skill: s.label, attempts: s.n, accuracy: s.score / s.n }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit);
}

/** Context sent to the quiz generator so it can review and avoid repeats. */
export function quizContext(p: Progress) {
  const core = p.history.filter((e) => !isFun(e));
  return {
    recentPrompts: core.slice(-25).map((e) => e.prompt).filter(Boolean),
    recentMistakes: core
      .filter((e) => e.verdict !== "correct")
      .slice(-10)
      .map((e) => `[${e.skill}] ${e.prompt} → esperado «${e.expected}», escribió «${e.answer}»`),
    weakSkills: weakSkills(p.history).map((w) => w.skill),
    recentPlaces: p.history.filter((e) => e.type === "geo").slice(-20).map((e) => e.expected.split(" · ")[0]),
  };
}
