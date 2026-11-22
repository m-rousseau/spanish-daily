export const TOPIC_IDS = ["mix", "vocabulary", "grammar", "verbs", "phrases", "speaking", "weak"] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export const TOPICS: { id: TopicId; emoji: string; label: string; brief: string }[] = [
  { id: "mix", emoji: "☀️", label: "Mezcla del día",
    brief: "A balanced mix across vocabulary, grammar, verbs and everyday phrases." },
  { id: "vocabulary", emoji: "📚", label: "Vocabulario",
    brief: "Core first-year vocabulary: meaning, gender of nouns (el/la), opposites, themed words." },
  { id: "grammar", emoji: "🧩", label: "Gramática",
    brief: "Articles and gender/number agreement, ser vs estar, hay, gustar, possessives, question words, por/para basics." },
  { id: "verbs", emoji: "🔁", label: "Verbos",
    brief: "Present tense conjugation: regular -ar/-er/-ir, stem-changing (e>ie, o>ue, e>i), irregular yo forms, ser/estar/tener/ir, ir a + infinitive." },
  { id: "phrases", emoji: "💬", label: "Frases útiles",
    brief: "Practical phrases: greetings, introductions, ordering food, asking directions, time, weather, shopping, polite expressions." },
  { id: "speaking", emoji: "🎤", label: "Hablar y escuchar",
    brief: "Mostly speaking and listening questions using short, useful sentences." },
  { id: "weak", emoji: "🎯", label: "Mis puntos débiles",
    brief: "Targeted review of the skills she gets wrong most often (listed below)." },
];

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
  "palabras interrogativas", "verbos reflexivos", "vocabulario: familia",
  "vocabulario: casa y universidad", "vocabulario: comida y restaurante",
  "vocabulario: ropa y colores", "vocabulario: ciudad y direcciones",
  "vocabulario: pasatiempos", "vocabulario: cuerpo y salud", "frases útiles",
  "pronunciación", "comprensión auditiva",
];

/**
 * What a first-semester university Spanish student (Université de Montréal,
 * ~A1 level) has typically covered. Edit this to match her actual syllabus.
 */
export const CURRICULUM = `
- Greetings, introductions, courtesy (hola, ¿cómo estás?, mucho gusto, por favor, gracias, de nada)
- Alphabet, numbers 0-100, telling time, days, months, dates, seasons, weather (hace frío, llueve)
- Subject pronouns; definite/indefinite articles; noun gender and plural; adjective agreement and placement
- Ser vs estar (origin/profession/description vs location/state/emotion); hay
- Present tense: regular -ar/-er/-ir; stem-changers (querer, poder, pedir, dormir); irregular yo (hago, tengo, salgo, conozco)
- Tener expressions (tener hambre/sed/frío/años/que), ir a + infinitive, gustar and similar (me gusta/n, me encanta)
- Possessive adjectives (mi, tu, su, nuestro); demonstratives (este, ese); question words (qué, cuál, dónde, cuándo, por qué)
- Themes: family, home, classroom and university, daily routine (simple reflexives: me levanto), food and restaurants, clothing and colors, shopping, city and directions, hobbies and sports, body and health basics
`;
