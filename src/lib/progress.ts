// Progress model and the pure functions that update it. Persistence lives in sync.ts.
import type { QuestionType, Verdict } from "./types";
import { DAYS_TO_GRADUATE, EXAM_PASS } from "./topics";
import { dailyBonus, GRADUATION_BONUS } from "./scoring";
import { newBadges } from "./badges";

export type HistoryEntry = {
  ts: number;
  date: string; // local YYYY-MM-DD
  level?: number;
  exam?: boolean;
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

export type LevelStat = { days: string[]; answered: number; correct: number };
export type Graduation = { level: number; date: string; score: number; passed: boolean };

export type Progress = {
  updatedAt: number;
  days: string[]; // every date practiced, YYYY-MM-DD
  points: number;
  bestStreak: number;
  level: number; // current difficulty level, 1-10
  levels: Record<string, LevelStat>; // per level: practice days and answers
  exams: Graduation[]; // every exam attempt
  badges: string[];
  history: HistoryEntry[];
};

export const DEFAULT_LEVEL = 2; // first university semester
const MAX_HISTORY = 3000;

export const emptyProgress = (): Progress => ({
  updatedAt: 0,
  days: [],
  points: 0,
  bestStreak: 0,
  level: DEFAULT_LEVEL,
  levels: {},
  exams: [],
  badges: [],
  history: [],
});

/** Fills in fields missing from older saved versions; drops anything malformed. */
export function normalizeProgress(raw: unknown): Progress {
  const p = { ...emptyProgress(), ...(raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Partial<Progress>) : {}) };
  p.days = Array.isArray(p.days) ? p.days.filter((d) => typeof d === "string") : [];
  p.history = Array.isArray(p.history) ? p.history.filter((e) => e && typeof e === "object" && typeof e.prompt === "string") : [];
  p.exams = Array.isArray(p.exams) ? p.exams.filter((e) => e && typeof e === "object") : [];
  p.badges = Array.isArray(p.badges) ? p.badges.filter((b) => typeof b === "string") : [];
  p.levels = p.levels && typeof p.levels === "object" && !Array.isArray(p.levels) ? p.levels : {};
  p.level = Number.isFinite(p.level) ? Math.min(Math.max(Math.round(p.level), 1), 10) : DEFAULT_LEVEL;
  p.points = Number.isFinite(p.points) ? p.points : 0;
  p.bestStreak = Number.isFinite(p.bestStreak) ? p.bestStreak : 0;
  p.updatedAt = Number.isFinite(p.updatedAt) ? p.updatedAt : 0;
  return p;
}

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export const levelStat = (p: Progress, level: number): LevelStat =>
  p.levels[String(level)] ?? { days: [], answered: 0, correct: 0 };

export const hasGraduated = (p: Progress, level: number) => p.exams.some((e) => e.level === level && e.passed);

/** The exam is offered automatically after DAYS_TO_GRADUATE distinct practice days at the level. */
export const examReady = (p: Progress, level: number) =>
  levelStat(p, level).days.length >= DAYS_TO_GRADUATE && !hasGraduated(p, level);

type NewEntry = Omit<HistoryEntry, "ts" | "date" | "level">;

export type RoundOutcome = { progress: Progress; bonus: number; levelDay: number | null; badges: string[] };

/**
 * Adds a finished practice round. Only distinct days count toward graduation:
 * extra rounds on the same day add points and history, not days.
 */
export function recordRound(prev: Progress, entries: NewEntry[], opts: { perfect: boolean }): RoundOutcome {
  const p = structuredClone(prev);
  const t = today();
  const level = p.level;
  const firstToday = !p.days.includes(t);
  if (firstToday) p.days.push(t);

  const stat = levelStat(p, level);
  let levelDay: number | null = null;
  if (!stat.days.includes(t)) {
    stat.days = [...stat.days, t];
    levelDay = stat.days.length;
  }
  stat.answered += entries.length;
  stat.correct += entries.filter((e) => e.verdict === "correct").length;
  p.levels[String(level)] = stat;

  const s = streak(p.days);
  const bonus = firstToday ? dailyBonus(s) : 0;
  const now = Date.now();
  p.history = [...p.history, ...entries.map((e, i) => ({ ...e, ts: now + i, date: t, level }))].slice(-MAX_HISTORY);
  p.points += entries.reduce((sum, e) => sum + e.points, 0) + bonus;
  p.bestStreak = Math.max(p.bestStreak, s, longestStreak(p.days));
  const earned = newBadges(p, { perfectRound: opts.perfect });
  p.badges = [...p.badges, ...earned];
  p.updatedAt = now;
  return { progress: p, bonus, levelDay, badges: earned };
}

export type ExamOutcome = { progress: Progress; score: number; passed: boolean; bonus: number; badges: string[] };

/** Records a finished exam. Passing moves her up one level (if she's still on that level). */
export function recordExam(prev: Progress, level: number, entries: NewEntry[]): ExamOutcome {
  const p = structuredClone(prev);
  const t = today();
  const scoreSum = entries.reduce((s, e) => s + (e.verdict === "correct" ? 1 : e.verdict === "almost" ? 0.5 : 0), 0);
  const score = entries.length ? scoreSum / entries.length : 0;
  const passed = score >= EXAM_PASS;
  const bonus = passed ? GRADUATION_BONUS : 0;
  const now = Date.now();
  p.history = [...p.history, ...entries.map((e, i) => ({ ...e, ts: now + i, date: t, level, exam: true }))].slice(
    -MAX_HISTORY,
  );
  p.points += entries.reduce((sum, e) => sum + e.points, 0) + bonus;
  p.exams = [...p.exams, { level, date: t, score: Math.round(score * 100), passed }];
  if (passed && p.level === level && level < 10) p.level = level + 1;
  const earned = newBadges(p, { perfectRound: false });
  p.badges = [...p.badges, ...earned];
  p.updatedAt = now;
  return { progress: p, score, passed, bonus, badges: earned };
}

export function setLevel(prev: Progress, level: number): Progress {
  return { ...prev, level: Math.min(Math.max(Math.round(level), 1), 10), updatedAt: Date.now() };
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
    recentNews: p.history.flatMap((e) => (e.type === "news" && e.link ? [e.link] : [])).slice(-30),
  };
}
