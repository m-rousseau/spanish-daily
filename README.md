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

- **Storage:** progress, the exam in progress and the tutor conversation are saved per user on the server (`src/lib/store.ts`: JSON files in `.data/`, mounted from `~/espanol-diario/data/`), with a copy in the browser so the site still works offline. The newest copy wins, compared by timestamp. (The code can also use Netlify Blobs when deployed on Netlify.)
- **Logging:** every API call writes one JSON line, visible with `docker compose logs web` on the server. It records the user, the purpose, the model, input/output tokens and timing; for chat it also records how much context was kept.
- **Cost:** Haiku 5.5 ($0.10 / $0.50 per million tokens). A practice round, a tutor answer or an exam batch costs a small fraction of a cent.

| File | Purpose |
|---|---|
| `src/lib/topics.ts` | Topics, the **10 levels** (edit `scope` to match a syllabus), the skill list, exam settings |
| `src/lib/claude.ts` | Every Haiku call: practice, fun questions, exam batches, grading, tutor |
| `src/lib/progress.ts` | Progress model, the 10-day rule, exams and levels (pure functions) |
| `src/lib/badges.ts`, `src/lib/scoring.ts` | Achievements, points, ranks |
| `src/lib/store.ts`, `src/lib/sync.ts` | Server storage (JSON files) and browser sync |
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

## Live site (home server + Tailscale Funnel)

**https://slave.tailc58c14.ts.net**: runs in Docker on the Ubuntu home server (`slave`) and is published to the internet with **Tailscale Funnel**. No Tailscale app or account is needed to visit it; the site's own login protects it. HTTPS comes from Tailscale, so the microphone works.

On the server, everything lives in `~/espanol-diario/`:

| Path | What it is |
|---|---|
| `docker-compose.yml`, `Dockerfile` | The container (`espanol-diario`), listening only on `127.0.0.1:3070` |
| `.env.production` | Secrets (chmod 600, never committed): `ANTHROPIC_SPANISH_DAILY` (API key), `APP_USERS`, `SESSION_SECRET`, Google settings |
| `google-key.json` | The Google service account's key (read-only photo access) |
| `data/` | Saved progress, exams and chats, one JSON file per user and document. **Back this folder up.** |

**Update the site** after changing code, from your Mac in this folder (copies the code, then rebuilds; secrets, the key and `data/` stay on the server):

```bash
rsync -az --delete --exclude node_modules --exclude .next --exclude .data --exclude data --exclude .git --exclude '.env*' --exclude google-key.json --exclude .claude ./ slave-lan:espanol-diario/ && ssh slave-lan 'cd ~/espanol-diario && docker compose up -d --build'
```

**Useful commands on the server:**

```bash
docker compose logs -f web          # live logs (one JSON line per API call)
docker compose restart web          # restart
tailscale funnel status             # check the public link
tailscale funnel --bg 3070          # turn the public link back on
tailscale funnel --https=443 off    # take the site offline
```

**Family photos:** add pictures to the Google Drive folder **Fotos para Mamá**. They appear within about 5 minutes, and her home page shows a "new photos" card.

## Tips for her

- **Use Chrome, Edge or Safari** for speaking questions. Firefox has no speech recognition, so it falls back to typing. The browser asks for microphone permission the first time.
- On iPhone/iPad, open the site in Safari and use **Share → Add to Home Screen** so it opens like an app.
- She stays logged in for 60 days on each device.

## Possible next steps

- **Backups:** copy `~/espanol-diario/data/` somewhere safe on a schedule (e.g. a nightly `rsync` or `tar`).
- **Daily reminder:** send an email or push notification each morning.
- **Usage cap:** add a per-user daily request limit if you ever share the site more widely.
