import type { QuestionType, Verdict } from "./types";
import type { Lang } from "./topics";

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

/** Bonus for passing a level exam. */
export const GRADUATION_BONUS = 300;

/** Points ranks (separate from the 1-10 difficulty levels). */
export const RANKS: { min: number; name: Record<Lang, string>; emoji: string }[] = [
  { min: 0, name: { es: "Principiante", en: "Newcomer" }, emoji: "🌱" },
  { min: 150, name: { es: "Aprendiz", en: "Apprentice" }, emoji: "📗" },
  { min: 400, name: { es: "Explorador", en: "Explorer" }, emoji: "🧭" },
  { min: 800, name: { es: "Viajero", en: "Traveler" }, emoji: "✈️" },
  { min: 1500, name: { es: "Conversador", en: "Conversationalist" }, emoji: "💬" },
  { min: 2500, name: { es: "Experto", en: "Expert" }, emoji: "⭐" },
  { min: 4000, name: { es: "Maestro", en: "Master" }, emoji: "🏆" },
  { min: 6000, name: { es: "Leyenda", en: "Legend" }, emoji: "👑" },
];

export function rankFor(points: number) {
  let i = 0;
  while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
  const current = RANKS[i];
  const next = RANKS[i + 1];
  const pct = next ? Math.round(((points - current.min) / (next.min - current.min)) * 100) : 100;
  return { ...current, next, pct };
}
