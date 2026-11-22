// Topics, the 10 difficulty levels and the skill list. Shared by server and browser.

export type Lang = "es" | "en";
export const LANGS = ["es", "en"] as const;

export const TOPIC_IDS = ["mix", "vocabulary", "grammar", "verbs", "phrases", "speaking", "weak"] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export const TOPICS: { id: TopicId; emoji: string; label: Record<Lang, string>; brief: string }[] = [
  { id: "mix", emoji: "☀️", label: { es: "Mezcla del día", en: "Daily mix" },
    brief: "A balanced mix across vocabulary, grammar, verbs and everyday phrases." },
  { id: "vocabulary", emoji: "📚", label: { es: "Vocabulario", en: "Vocabulary" },
    brief: "Vocabulary for this level: meaning, noun gender, opposites, themed words, word families." },
  { id: "grammar", emoji: "🧩", label: { es: "Gramática", en: "Grammar" },
    brief: "The grammar points of this level." },
  { id: "verbs", emoji: "🔁", label: { es: "Verbos", en: "Verbs" },
    brief: "Conjugation and verb use in the tenses and moods of this level." },
  { id: "phrases", emoji: "💬", label: { es: "Frases útiles", en: "Useful phrases" },
    brief: "Practical, real-life expressions and short dialogues for this level." },
  { id: "speaking", emoji: "🎤", label: { es: "Hablar y escuchar", en: "Speaking & listening" },
    brief: "Mostly speaking and listening questions." },
  { id: "weak", emoji: "🎯", label: { es: "Mis puntos débiles", en: "My weak spots" },
    brief: "Targeted review of the skills she gets wrong most often (listed below)." },
];

export type LevelInfo = {
  n: number;
  cefr: string;
  name: Record<Lang, string>;
  summary: Record<Lang, string>;
  /** What this level covers (cumulative with lower levels). Used in prompts. */
  scope: string;
  /** How hard the Spanish in instructions, hints and feedback may be. */
  style: string;
};

/**
 * Level 1 = first steps, level 10 = fluent. Level 2 matches a first university
 * semester (Université de Montréal, ~A1). Edit `scope` to match a syllabus.
 */
export const LEVELS: LevelInfo[] = [
  {
    n: 1, cefr: "Pre-A1",
    name: { es: "Primeros pasos", en: "First steps" },
    summary: { es: "Saludos, números, colores y frases muy cortas.", en: "Greetings, numbers, colors and very short sentences." },
    scope: "Greetings and goodbyes; numbers 0-20; colors; days of the week; very common nouns with el/la/un/una; subject pronouns; ser in the present (soy, eres, es); tener for age and possession (tengo, tienes); yes/no questions; ¿cómo te llamas?, ¿de dónde eres?",
    style: "Very short sentences (3-6 words), only the most common words, present tense only.",
  },
  {
    n: 2, cefr: "A1",
    name: { es: "Principiante", en: "Beginner" },
    summary: { es: "Primer semestre: ser/estar, presente, gustar, la vida diaria.", en: "First semester: ser/estar, present tense, gustar, daily life." },
    scope: `Greetings, courtesy; numbers 0-100, time, dates, weather; articles, noun gender and plural, adjective agreement; ser vs estar; hay; present tense regular -ar/-er/-ir, stem-changers (querer, poder, pedir, dormir), irregular yo forms (hago, tengo, salgo, conozco); tener expressions; ir a + infinitive; gustar/encantar; possessive adjectives; demonstratives; question words; simple reflexives (me levanto). Themes: family, home, university, routine, food and restaurants, clothing, shopping, city and directions, hobbies, body and health.`,
    style: "Short sentences, present tense, common words.",
  },
  {
    n: 3, cefr: "A1+",
    name: { es: "Básico", en: "Elementary" },
    summary: { es: "Rutina, comparaciones, planes y el pasado reciente.", en: "Routines, comparisons, plans and the recent past." },
    scope: "Everything in level 2, plus: reflexive verbs for daily routine; comparatives (más/menos... que, tan... como); prepositions of place; frequency adverbs; estar + gerund (present progressive); direct object pronouns (lo, la, los, las); acabar de + infinitive; making plans and invitations.",
    style: "Short sentences; mostly present tense; common words.",
  },
  {
    n: 4, cefr: "A2",
    name: { es: "Elemental", en: "Pre-intermediate" },
    summary: { es: "El pretérito, pronombres y contar lo que pasó.", en: "The preterite, pronouns and telling what happened." },
    scope: "Everything before, plus: preterite of regular verbs and common irregulars (fui, tuve, hice, estuve, dije, pude); indirect object pronouns and double pronouns (se lo); superlatives; travel, health and work vocabulary; telling a simple story in the past.",
    style: "Simple sentences; present and past tense.",
  },
  {
    n: 5, cefr: "A2+",
    name: { es: "Pre-intermedio", en: "Lower intermediate" },
    summary: { es: "Imperfecto vs. pretérito, por/para y el futuro.", en: "Imperfect vs. preterite, por/para and the future." },
    scope: "Everything before, plus: imperfect tense and imperfect vs preterite; por vs para; simple future; possessive pronouns (el mío); describing the past and childhood; giving advice with tener que / deber.",
    style: "Clear everyday Spanish; past and future tenses allowed.",
  },
  {
    n: 6, cefr: "B1",
    name: { es: "Intermedio", en: "Intermediate" },
    summary: { es: "Perfecto, condicional, imperativo y el subjuntivo básico.", en: "Present perfect, conditional, commands and basic subjunctive." },
    scope: "Everything before, plus: present perfect (he comido); conditional (me gustaría); affirmative and negative commands; present subjunctive after wishes and recommendations (quiero que, es importante que); relative clauses (que, donde, lo que).",
    style: "Natural everyday Spanish at intermediate level.",
  },
  {
    n: 7, cefr: "B1+",
    name: { es: "Intermedio alto", en: "Upper intermediate" },
    summary: { es: "Subjuntivo con duda y emoción, pluscuamperfecto, conectores.", en: "Subjunctive of doubt and emotion, pluperfect, connectors." },
    scope: "Everything before, plus: subjunctive with doubt, emotion and conjunctions (cuando + subjunctive, para que, aunque); pluperfect; reported speech basics; common idioms; opinions and arguments.",
    style: "Natural Spanish with some complex sentences.",
  },
  {
    n: 8, cefr: "B2",
    name: { es: "Avanzado", en: "Advanced" },
    summary: { es: "Subjuntivo imperfecto, oraciones con si, la voz pasiva.", en: "Imperfect subjunctive, si-clauses, passive voice." },
    scope: "Everything before, plus: imperfect subjunctive; si-clauses (si tuviera..., si hubiera...); passive and impersonal se; nuanced vocabulary and synonyms; news-level reading; formal vs informal register.",
    style: "Fluent, natural Spanish.",
  },
  {
    n: 9, cefr: "C1",
    name: { es: "Experto", en: "Proficient" },
    summary: { es: "Todos los tiempos, matices, registro y expresiones idiomáticas.", en: "All tenses, nuance, register and idioms." },
    scope: "Everything before, plus: all tenses including perfect subjunctive and conditional perfect; sophisticated connectors; idiomatic expressions and set phrases; regional variants (Spain, Mexico, Río de la Plata, Caribbean); precise register.",
    style: "Rich, natural Spanish as for an advanced learner.",
  },
  {
    n: 10, cefr: "C2",
    name: { es: "Fluido", en: "Fluent" },
    summary: { es: "Como un hablante nativo: humor, literatura, prensa y dialectos.", en: "Near-native: humor, literature, press and dialects." },
    scope: "Near-native mastery: subtle nuance, humor and wordplay, literary and journalistic Spanish, dialectal vocabulary, rare tenses, stylistic choices.",
    style: "Fully native-level Spanish.",
  },
];

export const levelInfo = (n: number) => LEVELS[Math.min(Math.max(Math.round(n), 1), 10) - 1];

/** Days of practice at a level before the exam is offered automatically. */
export const DAYS_TO_GRADUATE = 10;
export const EXAM_QUESTIONS = 100;
export const EXAM_BATCH = 5; // questions per request (keeps each request well under hosting time limits)
export const EXAM_PASS = 0.7;

/**
 * Canonical skill labels. Claude tags each question with one of these so the
 * app can measure which skills she finds hardest.
 */
export const SKILLS = [
  "saludos y cortesía", "números y la hora", "días, meses y el tiempo",
  "artículos y género", "plural y concordancia", "ser y estar", "hay",
  "verbos regulares -ar", "verbos regulares -er/-ir", "verbos con cambio de raíz",
  "verbos irregulares (yo)", "ser, estar, tener, ir", "expresiones con tener",
  "ir a + infinitivo", "gustar y encantar", "posesivos", "demostrativos",
  "palabras interrogativas", "verbos reflexivos", "comparativos y superlativos",
  "estar + gerundio", "pronombres de objeto", "pretérito indefinido", "pretérito imperfecto",
  "indefinido vs. imperfecto", "por y para", "futuro simple", "pretérito perfecto",
  "condicional", "imperativo", "subjuntivo presente", "subjuntivo (duda y emoción)",
  "pluscuamperfecto", "subjuntivo imperfecto", "oraciones con si", "se pasivo e impersonal",
  "estilo indirecto", "conectores", "expresiones idiomáticas", "registro formal e informal",
  "vocabulario: familia", "vocabulario: casa y universidad", "vocabulario: comida y restaurante",
  "vocabulario: ropa y colores", "vocabulario: ciudad y direcciones", "vocabulario: pasatiempos",
  "vocabulario: cuerpo y salud", "vocabulario: trabajo", "vocabulario: viajes",
  "vocabulario: noticias y sociedad", "frases útiles", "pronunciación",
  "comprensión auditiva", "comprensión lectora",
];
