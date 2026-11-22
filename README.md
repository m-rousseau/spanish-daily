# Español diario 🌞

Five minutes of Spanish practice each morning, built for a beginner finishing her first university semester (Université de Montréal, about CEFR A1).

She logs in, picks a topic (or keeps **Mezcla del día**), can type an optional focus ("más gramática", "verbos irregulares", "en el restaurante"), and gets a round of 5 practice questions plus 2 fun bonus questions, all written by Claude Haiku 5.5:

| Type | How it works |
|---|---|
| **Multiple choice** | Tap an answer. It is graded instantly and the explanation is shown. |
| **Open text** | Fill in the blank, conjugate a verb, or answer a short question. Accent buttons (á é í ó ú ñ ¿ ¡) sit under the box. Claude grades it as *correct / almost / incorrect* and explains the fix. |
| **Speaking** 🎤 | Tap the mic and say the answer in Spanish. The browser transcribes it and Claude grades the transcript, ignoring accents and punctuation. She can hear a model answer afterwards. |
| **Listening** 🔊 | The app reads a Spanish sentence aloud, at normal speed or slowly, and she writes what she heard. |
| **🌎 Bonus: where is this?** | A satellite photo (no labels) of a famous place in a Spanish-speaking country. She picks where it is, then what it is famous for. Afterwards the map adds place names and zooms out to show where it is. |
| **📰 Bonus: news of the day** | A simple question about a real headline from today's Spanish-language news (BBC Mundo, Europa Press, DW Español), with a link to the article. It alternates daily between **politics** and a **good-news** story. |

Topics: Mezcla del día · Vocabulario · Gramática · Verbos · Frases útiles · Hablar y escuchar · **🎯 Mis puntos débiles**.
**Everything is in Spanish (full immersion):** the interface, instructions, hints, explanations and Claude's feedback. Claude is told to keep that Spanish at her level, with short sentences and common words. Because there is no other language on screen, quizzes have no translation exercises.

### Tracking and scoring

- **Streak tracker:** 🔥 days in a row, her best streak, and the last 7 days on the home page. The history page has a 5-week calendar.
- **Points:** 10 per correct answer, 5 for "almost", 15 for the news question, and 10 + 10 for the two parts of the map question. The first round of each day earns a **daily bonus** of 20 points plus 5 per streak day (up to +50).
- **Levels:** 🌱 Principiante → 📗 Aprendiz → 🧭 Explorador → ✈️ Viajero → 💬 Conversador → ⭐ Experto → 🏆 Maestro → 👑 Leyenda, with a progress bar to the next level.
- **Another round:** after each round she can start another with the same topic and new questions, switch to her weak spots, or change topic.
- **History page (`/historia`):** every past question grouped by day, with her answer, the correct answer, feedback and points. It can be filtered to show only mistakes or only fun questions.
- **Weak spots:** Claude tags every practice question with a skill (e.g. "ser y estar", "verbos con cambio de raíz"). The app works out which skills she gets wrong most often (at least 2 attempts, under 80% correct), lists them on the history page, and the **🎯 Mis puntos débiles** topic builds a whole round around them using her recent mistakes. Mistakes and recent questions also feed into normal rounds, so questions don't repeat.

## How it works

```
Browser (client components)                  Server (Next.js route handlers)            Outside services
───────────────────────────                  ───────────────────────────────            ────────────────
login form ───────────────────────────────▶  server action: check APP_USERS,
                                             set signed httpOnly cookie
"Start" ─ POST /api/quiz {topic, focus,  ──▶ verify cookie, then in parallel:
          weak skills, recent mistakes,        • 5 practice questions        ─────────▶ claude-haiku-5-5
          recent places}                       • fun questions: fetch RSS    ─────────▶ news feeds (cached 1h)
                                                 headlines, then geo + news  ─────────▶ claude-haiku-5-5
answer  ─ POST /api/grade {question, ───────▶ verify cookie → gradeAnswer() ─────────▶ claude-haiku-5-5
          answer}
map tiles load from Esri World Imagery; speech runs in the browser (Web Speech API)
points, streak and full history are saved in the browser's localStorage
```

- The API key stays on the server and never reaches the browser.
- **Every Claude request uses `claude-haiku-5-5`** (set once in `src/lib/claude.ts`) at `effort: "low"` so responses come back quickly. Structured outputs (Zod schemas) guarantee the JSON shape.
- The fun questions are optional: if the news feeds or that request fail, the round still has its 5 practice questions (and the map question without news, if only the feeds failed).
- **Cost:** each round is 2 generation calls plus up to 3 grading calls. At Haiku 5.5 prices ($0.10 / $0.50 per million tokens) that is still well under a cent a day.

| File | Purpose |
|---|---|
| `src/lib/topics.ts` | Topics, the **curriculum** and the skill list. Edit `CURRICULUM` to match her actual syllabus. |
| `src/lib/claude.ts` | Prompts, schemas and every Claude call (practice, fun questions, grading) |
| `src/lib/news.ts` | Fetches and caches Spanish-language news headlines |
| `src/lib/scoring.ts` | Points, daily bonus and levels |
| `src/lib/progress.ts` | Streak, points, history and weak-skill analysis (localStorage) |
| `src/lib/session.ts`, `src/proxy.ts` | Login and signed-cookie sessions |
| `src/lib/speech.ts` | Browser speech recognition and text-to-speech |
| `src/components/` | UI: `Practice` (home, round, results), `QuestionCard`, `GeoMap`, `Tracker`, `History` |

## Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `ANTHROPIC_API_KEY`: create one at https://console.anthropic.com/settings/keys. Setting a monthly spend limit in the Console is a good idea.
- `APP_USERS`: who can log in, as `Name:password` pairs separated by commas, e.g. `Maman:soleil-2026,Marc:something-else`. Names are not case-sensitive.
- `SESSION_SECRET`: a random string. Generate one with `openssl rand -base64 32`.

```bash
npm run dev
```

Then open http://localhost:3000.

## Deploy (Vercel, free tier)

1. Push this repo to GitHub.
2. At https://vercel.com/new, import the repository. The framework is detected automatically.
3. Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY`, `APP_USERS` and `SESSION_SECRET` (use a new secret, not your local one).
4. Deploy. Optionally add a custom domain under **Settings → Domains**.

Any other Node host works too (Netlify, Render, Fly.io, a VPS). Run `npm run build && npm start` with the same three environment variables. The site must be served over **HTTPS**, because browsers only allow the microphone on secure origins.

## Tips for her

- **Use Chrome, Edge or Safari** for speaking questions. Firefox has no speech recognition, so it falls back to typing. The browser asks for microphone permission the first time.
- On iPhone/iPad, open the site in Safari and use **Share → Add to Home Screen** so it opens like an app.
- She stays logged in for 60 days on each device.

## Possible next steps

- **Sync progress across devices:** points, streak and history currently live in each browser (clearing the browser's site data erases them). Moving it to a small database (e.g. Upstash Redis or Vercel Postgres, keyed by user name) would share it between her phone and computer.
- **Daily reminder:** send an email or push notification each morning.
- **Usage cap:** add a per-user daily request limit if you ever share the site more widely.
