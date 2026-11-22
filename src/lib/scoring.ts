import type { QuestionType, Verdict } from "./types";

/** Points for one answered question. */
export function pointsFor(type: QuestionType, verdict: Verdict, geoParts?: [boolean, boolean]): number {
  if (type === "geo" && geoParts) return (geoParts[0] ? 10 : 0) + (geoParts[1] ? 10 : 0);
  if (verdict === "correct") return type === "news" ? 15 : 10;
  if (verdict === "almost") return 5;
  return 0;
}

/** Bonus for the first round of the day: 20, plus 5 per day of streak (max +50). */
export function dailyBonus(streakDays: number): number {
  return 20 + Math.min(streakDays, 10) * 5;
}

export const LEVELS = [
  { min: 0, name: "Principiante", emoji: "🌱" },
  { min: 150, name: "Aprendiz", emoji: "📗" },
  { min: 400, name: "Explorador", emoji: "🧭" },
  { min: 800, name: "Viajero", emoji: "✈️" },
  { min: 1500, name: "Conversador", emoji: "💬" },
  { min: 2500, name: "Experto", emoji: "⭐" },
  { min: 4000, name: "Maestro", emoji: "🏆" },
  { min: 6000, name: "Leyenda", emoji: "👑" },
];

export function levelFor(points: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const current = LEVELS[i];
  const next = LEVELS[i + 1];
  const pct = next ? Math.round(((points - current.min) / (next.min - current.min)) * 100) : 100;
  return { ...current, next, pct };
}
