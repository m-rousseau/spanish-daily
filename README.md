# Español diario 🌞

Five minutes of Spanish practice each morning, built for a beginner finishing her first university semester (Université de Montréal, about CEFR A1).

She logs in, picks a topic and gets a round of 5 practice questions plus 2 fun bonus questions (a satellite-map place quiz and a question about today's Spanish-language news), all written by **Claude Haiku 5.5**.

## Features

| Area | What it does |
|---|---|
| **10 levels** | Level 1 (first steps, Pre-A1) to level 10 (fluent, C2), defined in `src/lib/topics.ts`. Every Claude request is tuned to the current level. Level 2 matches a first university semester and is the default. She can switch levels freely. |
| **Graduation** | A level's final exam is offered automatically after **10 different days** of practice at that level. Extra rounds on the same day add points, not days. She can also ask to take the exam at any time ("🎓 Quiero graduarme"). |
| **Level exam** | 100 questions (vocabulary, grammar, verbs, reading, listening and speaking), generated in batches of 5 in the background. Progress is saved after every answer, so she can pause and resume on any device. 70% passes: she moves up a level and gets +300 points. |
| **✨ More questions** | Always available: a new round with new content from Haiku. It doesn't count toward graduating. |
| **Question types** | Multiple choice, typed answers (graded by Claude), speaking (browser speech recognition, graded by Claude), listening (text-to-speech), the 🌎 map quiz and 📰 news. |
| **Tutor chat** | A floating 💬 Tutor on every page (Haiku 5.5). It sees the question on screen, her profile and her history, and remembers the conversation across sessions and devices. The server trims its context to the newest **90,000 characters**. |
| **Game elements** | Streak tracker, points, ranks (🌱 → 👑), achievements, daily bonus, and a celebration screen when she graduates. |
| **History** | Every question by day, filterable (mistakes / fun / exams), per-level stats, exam scores, achievements, and her weakest skills with a "practice these" button. |
| **ES / EN toggle** | Switches all interface text and Claude's instructions, hints and feedback. Questions and answers always stay in Spanish. |

## How it works

- **Storage:** progress, the exam in progress and the tutor conversation are saved per user in **Netlify Blobs** (`src/lib/store.ts`), with a copy in the browser so the site still works offline. The newest copy wins, compared by timestamp. In local dev, documents are saved to `./.data/` instead.
- **Logging:** every API call writes one JSON line, visible in Netlify → Functions → Next.js Server Handler. It records the user, the purpose, the model, input/output tokens and timing; for chat it also records how much context was kept.
- **Cost:** Haiku 5.5 ($0.10 / $0.50 per million tokens). A practice round, a tutor answer or an exam batch costs a small fraction of a cent.

| File | Purpose |
|---|---|
| `src/lib/topics.ts` | Topics, the **10 levels** (edit `scope` to match a syllabus), the skill list, exam settings |
| `src/lib/claude.ts` | Every Haiku call: practice, fun questions, exam batches, grading, tutor |
| `src/lib/progress.ts` | Progress model, the 10-day rule, exams and levels (pure functions) |
| `src/lib/badges.ts`, `src/lib/scoring.ts` | Achievements, points, ranks |
| `src/lib/store.ts`, `src/lib/sync.ts` | Server storage (Netlify Blobs) and browser sync |
| `src/lib/trim.ts` | The tutor's 90,000-character context budget |
| `src/app/api/*` | `quiz`, `grade`, `exam`, `chat`, `state/[doc]`, `login`, `logout` |
| `src/components/` | `Practice`, `Exam`, `History`, `ChatWidget`, `LevelCard`, `QuestionCard`, `GeoMap`, `Tracker` |

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

## Live site

Hosted on **Netlify** (free plan): https://spanish-daily-o8zz.netlify.app

- Every push to `main` on GitHub redeploys automatically.
- The three environment variables are set in Netlify under **Project configuration → Environment variables**. After changing one, trigger a new deploy (Deploys → Trigger deploy).
- Visitor access: production is public (the app has its own login); deploy previews stay private to the Netlify team.

## Deploy elsewhere (Vercel, free tier)

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
