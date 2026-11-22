// Shapes shared by the server (API routes) and the browser.

export type QuestionType = "multiple_choice" | "open_text" | "speaking" | "listening" | "geo" | "news";
export type Verdict = "correct" | "almost" | "incorrect";

export type GeoInfo = {
  place: string;
  country: string;
  lat: number;
  lon: number;
  zoom: number;
  known_for_prompt: string;
  known_for_choices: string[];
  known_for_index: number;
};

export type NewsInfo = { title: string; url: string; source: string; kind: "política" | "buena noticia" };

export type Question = {
  type: QuestionType;
  skill: string; // short Spanish label, e.g. "ser y estar"; "diversión" for fun questions
  instruction: string;
  prompt: string;
  spanish_audio: string;
  choices: string[];
  correct_index: number;
  expected_answer: string;
  explanation: string;
  hint: string;
  geo?: GeoInfo;
  news?: NewsInfo;
};

export type Grade = { verdict: Verdict; feedback: string; corrected: string };
