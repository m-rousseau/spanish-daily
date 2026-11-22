import type { Lang } from "./topics";
import type { Progress } from "./progress";

type Ctx = { perfectRound: boolean };

export type Badge = { id: string; emoji: string; name: Record<Lang, string>; earned: (p: Progress, ctx: Ctx) => boolean };

const count = (p: Progress, f: (e: Progress["history"][number]) => boolean) => p.history.filter(f).length;

export const BADGES: Badge[] = [
  { id: "first_round", emoji: "🌱", name: { es: "Primera ronda", en: "First round" }, earned: (p) => p.days.length >= 1 },
  { id: "streak_3", emoji: "🔥", name: { es: "3 días seguidos", en: "3-day streak" }, earned: (p) => p.bestStreak >= 3 },
  { id: "streak_7", emoji: "🔥", name: { es: "Una semana seguida", en: "One-week streak" }, earned: (p) => p.bestStreak >= 7 },
  { id: "streak_30", emoji: "🌋", name: { es: "Un mes seguido", en: "One-month streak" }, earned: (p) => p.bestStreak >= 30 },
  { id: "days_10", emoji: "📅", name: { es: "10 días de práctica", en: "10 practice days" }, earned: (p) => p.days.length >= 10 },
  { id: "perfect", emoji: "💯", name: { es: "Ronda perfecta", en: "Perfect round" }, earned: (_p, c) => c.perfectRound },
  { id: "q_100", emoji: "📝", name: { es: "100 preguntas", en: "100 questions" }, earned: (p) => p.history.length >= 100 },
  { id: "q_500", emoji: "📚", name: { es: "500 preguntas", en: "500 questions" }, earned: (p) => p.history.length >= 500 },
  {
    id: "explorer",
    emoji: "🌎",
    name: { es: "Exploradora: 5 lugares", en: "Explorer: 5 places" },
    earned: (p) => count(p, (e) => e.type === "geo" && e.verdict === "correct") >= 5,
  },
  {
    id: "news",
    emoji: "📰",
    name: { es: "Al día: 10 noticias", en: "Up to date: 10 news" },
    earned: (p) => count(p, (e) => e.type === "news") >= 10,
  },
  {
    id: "speaker",
    emoji: "🎤",
    name: { es: "Habladora: 10 respuestas orales", en: "Speaker: 10 spoken answers" },
    earned: (p) => count(p, (e) => e.type === "speaking" && e.verdict === "correct") >= 10,
  },
  { id: "graduate", emoji: "🎓", name: { es: "Primera graduación", en: "First graduation" }, earned: (p) => p.exams.some((e) => e.passed) },
  { id: "level_5", emoji: "🚀", name: { es: "Nivel 5", en: "Level 5" }, earned: (p) => p.level >= 5 },
  { id: "level_10", emoji: "👑", name: { es: "Nivel 10: fluida", en: "Level 10: fluent" }, earned: (p) => p.level >= 10 },
  { id: "points_1000", emoji: "💎", name: { es: "1000 puntos", en: "1000 points" }, earned: (p) => p.points >= 1000 },
];

/** Badges newly earned by this state (not already held). */
export function newBadges(p: Progress, ctx: Ctx): string[] {
  return BADGES.filter((b) => !p.badges.includes(b.id) && b.earned(p, ctx)).map((b) => b.id);
}

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
