"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { DAYS_TO_GRADUATE, TOPICS, type TopicId } from "@/lib/topics";
import { quizContext, recordRound, setLevel, today, weakSkills, type RoundOutcome } from "@/lib/progress";
import { badgeById } from "@/lib/badges";
import { useAppProgress } from "./AppShell";
import { useLang } from "./LangProvider";
import Header from "./Header";
import Tracker from "./Tracker";
import LevelCard from "./LevelCard";
import NewPhotosCard from "./NewPhotosCard";
import QuestionCard, { verdictIcon, type Result } from "./QuestionCard";

type Phase = "home" | "loading" | "quiz" | "done";

export default function Practice({ name, initialTopic }: { name: string; initialTopic?: TopicId }) {
  const router = useRouter();
  const { t, lang } = useLang();
  const { progress, update } = useAppProgress();
  const [topic, setTopic] = useState<TopicId>(initialTopic ?? "mix");
  const [focus, setFocus] = useState("");
  const [phase, setPhase] = useState<Phase>("home");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);

  // Leaving the page from a results screen returns her to the topic picker next time;
  // a round in progress is kept so she can come back to it.
  const phaseRef = useRef<Phase>(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(
    () => () => {
      if (phaseRef.current === "done") setPhase("home");
    },
    [],
  );

  async function start(topicOverride?: TopicId) {
    const chosen = topicOverride ?? topic;
    if (topicOverride) setTopic(topicOverride);
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: chosen, level: progress.level, lang, focus: focus.trim(), ...quizContext(progress) }),
      });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setResults(data.questions.map(() => null));
      setIndex(0);
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Error");
      setPhase(phase === "done" ? "done" : "home");
    }
  }

  function finish() {
    const label = TOPICS.find((x) => x.id === topic)?.label.es ?? topic;
    const entries = questions.flatMap((q, i) => {
      const r = results[i];
      if (!r) return [];
      return [
        {
          topic: label,
          type: q.type,
          skill: q.skill,
          instruction: q.instruction,
          prompt: q.type === "geo" ? `🌎 ${q.geo?.place ?? ""}: ¿dónde está y por qué es famoso?` : q.prompt || q.spanish_audio,
          answer: r.answer,
          expected: r.grade.corrected || q.expected_answer,
          verdict: r.grade.verdict,
          points: r.points,
          feedback: r.grade.feedback,
          link: q.news?.url,
        },
      ];
    });
    const out = recordRound(progress, entries, {
      perfect: entries.length > 0 && entries.every((e) => e.verdict === "correct"),
    });
    update(out.progress);
    setOutcome(out);
    setPhase("done");
  }

  const practicedToday = progress.days.includes(today());
  const hasWeak = weakSkills(progress.history).length > 0;
  const correctCount = results.filter((r) => r?.grade.verdict === "correct").length;
  const roundPoints = results.reduce((s, r) => s + (r?.points ?? 0), 0);
  const good = questions.length > 0 && correctCount / questions.length >= 0.6;

  const moreButton = (
    <button onClick={() => start()} className="btn-primary w-full flex-col gap-0 text-xl" data-testid="more">
      {t.more}
      <span className="text-sm font-semibold opacity-90">{t.moreHint}</span>
    </button>
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-28">
      <Header active="practice" />

      {phase === "home" && (
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold">
              {t.hello}, {name}!
            </h1>
            <p className={`mt-1 ${practicedToday ? "text-good" : "text-muted"}`}>{practicedToday ? t.doneToday : t.notToday}</p>
          </div>

          <NewPhotosCard name={name} />
          <Tracker progress={progress} />
          <LevelCard progress={progress} onSetLevel={(n) => update(setLevel(progress, n))} />

          <div>
            <h2 className="mb-3 text-xl font-bold">{t.pick}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TOPICS.map((tp) => (
                <button
                  key={tp.id}
                  onClick={() => setTopic(tp.id)}
                  aria-pressed={topic === tp.id}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    topic === tp.id ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-accent"
                  } ${tp.id === "weak" ? "col-span-2 sm:col-span-3" : ""}`}
                >
                  <div className="text-3xl">{tp.emoji}</div>
                  <div className="mt-1 font-bold leading-tight">{tp.label[lang]}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label">{t.focusLabel}</span>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={t.focusPlaceholder}
              maxLength={200}
              className="input text-lg"
            />
          </label>

          {error && (
            <p className="rounded-2xl bg-bad-soft p-4 text-bad" role="alert">
              {error}
            </p>
          )}
          <button onClick={() => start()} className="btn-primary w-full text-xl" data-testid="start">
            {practicedToday ? t.more : `${t.start} →`}
          </button>
        </section>
      )}

      {phase === "loading" && (
        <section className="card flex flex-col items-center gap-3 py-16 text-center">
          <div className="animate-bounce text-5xl">🌮</div>
          <p className="text-xl">{t.loading}</p>
          <p className="text-base text-muted">{t.loadingFun}</p>
        </section>
      )}

      {phase === "quiz" && questions[index] && (
        <QuestionCard
          key={index}
          q={questions[index]}
          number={index + 1}
          total={questions.length}
          level={progress.level}
          context={lang === "en" ? `Practice (level ${progress.level})` : `Práctica (nivel ${progress.level})`}
          result={results[index]}
          onResult={(r) => setResults((prev) => prev.map((x, i) => (i === index ? r : x)))}
          onNext={() => (index + 1 < questions.length ? setIndex(index + 1) : finish())}
        />
      )}

      {phase === "done" && outcome && (
        <section className="space-y-4">
          <div className="card space-y-3 text-center">
            <div className="text-6xl">{good ? "🎉" : "💪"}</div>
            <h2 className="text-3xl font-extrabold">{good ? t.results : t.effort}</h2>
            <p className="text-2xl">{t.score(correctCount, questions.length)}</p>
            <p className="text-xl font-bold text-good">{t.roundPoints(roundPoints)}</p>
            {outcome.bonus > 0 && <p className="text-lg font-bold text-accent">{t.dailyBonus(outcome.bonus)}</p>}
            {outcome.levelDay !== null && (
              <p className="text-lg font-bold" data-testid="level-day">
                {t.dayCounted(Math.min(outcome.levelDay, DAYS_TO_GRADUATE), DAYS_TO_GRADUATE)}
              </p>
            )}
            {outcome.badges.map((id) => {
              const b = badgeById(id);
              return b ? (
                <p key={id} className="rounded-2xl bg-warn-soft p-2 text-lg font-bold text-warn">
                  {t.badgeNew(`${b.emoji} ${b.name[lang]}`)}
                </p>
              ) : null;
            })}
          </div>

          {error && (
            <p className="rounded-2xl bg-bad-soft p-4 text-bad" role="alert">
              {error}
            </p>
          )}
          {moreButton}

          <Tracker progress={progress} />

          <ul className="card space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-background p-3">
                <span>{verdictIcon(results[i]?.grade.verdict)}</span>
                <span className="flex-1">
                  <span className="text-muted">
                    {q.type === "geo" ? "🌎 " : q.type === "news" ? "📰 " : ""}
                    {q.prompt || q.spanish_audio}
                  </span>
                  <br />
                  <strong>{results[i]?.grade.corrected || q.expected_answer}</strong>
                </span>
                <span className="whitespace-nowrap text-sm font-bold text-muted">+{results[i]?.points ?? 0}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-3">
            {hasWeak && (
              <button onClick={() => start("weak")} className="btn-ghost w-full">
                🎯 {t.weakBtn}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPhase("home")} className="btn-ghost">
                {t.changeTopic}
              </button>
              <Link href="/historia" className="btn-ghost">
                📖 {t.history}
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
