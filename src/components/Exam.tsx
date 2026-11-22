"use client";
import { goToLogin } from "@/lib/nav";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { DAYS_TO_GRADUATE, EXAM_BATCH, EXAM_PASS, EXAM_QUESTIONS, levelInfo, type Lang } from "@/lib/topics";
import { examReady, hasGraduated, levelStat, recordExam, type ExamOutcome } from "@/lib/progress";
import { badgeById } from "@/lib/badges";
import { loadDoc, readCache, saveDoc } from "@/lib/sync";
import { useAppProgress } from "./AppShell";
import { useLang } from "./LangProvider";
import Header from "./Header";
import QuestionCard, { type Result } from "./QuestionCard";

type ExamState = {
  updatedAt?: number;
  level: number | null; // null = no exam in progress
  lang: Lang;
  startedAt: number;
  questions: (Question | null)[];
  results: (Result | null)[];
  index: number;
};

const PARTS = EXAM_QUESTIONS / EXAM_BATCH;
const CONCURRENCY = 3;
const noExam = (): ExamState => ({ level: null, lang: "es", startedAt: 0, questions: [], results: [], index: 0 });

export default function Exam({ name }: { name: string }) {
  const { t, lang } = useLang();
  const { progress, update } = useAppProgress();
  const [exam, setExam] = useState<ExamState>(() => readCache<ExamState>("exam", name) ?? noExam());
  const [failedParts, setFailedParts] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<(ExamOutcome & { level: number }) | null>(null);
  const examRef = useRef(exam);

  // Next.js keeps visited pages alive in the background: clear the results screen
  // when she leaves, so coming back shows the next level's exam, not old results.
  useEffect(() => () => setOutcome(null), []);
  const loading = useRef(new Set<number>());

  const commit = useCallback(
    (next: ExamState) => {
      examRef.current = next;
      setExam(saveDoc("exam", name, next));
    },
    [name],
  );

  // Newest saved exam from the server (resume on another device).
  useEffect(() => {
    let alive = true;
    loadDoc<ExamState>("exam", name).then((doc) => {
      if (alive && doc) {
        examRef.current = doc;
        setExam(doc);
      }
    });
    return () => {
      alive = false;
    };
  }, [name]);

  const loadPart = useCallback(
    async (part: number) => {
      const cur = examRef.current;
      if (cur.level === null || loading.current.has(part)) return;
      loading.current.add(part);
      setFailedParts((f) => f.filter((p) => p !== part));
      try {
        const avoid = cur.questions.flatMap((q) => (q ? [(q.prompt || q.spanish_audio).slice(0, 200)] : []));
        const res = await fetch("/api/exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: cur.level, lang: cur.lang, part, avoid }),
        });
        if (res.status === 401) {
          goToLogin();
          return;
        }
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error(data.error);
        const latest = examRef.current;
        if (latest.level !== cur.level || latest.startedAt !== cur.startedAt) return; // exam was restarted meanwhile
        const questions = [...latest.questions];
        for (let i = 0; i < EXAM_BATCH; i++) questions[part * EXAM_BATCH + i] = data.questions[i % data.questions.length];
        commit({ ...latest, questions });
      } catch {
        setFailedParts((f) => [...new Set([...f, part])]);
      } finally {
        loading.current.delete(part);
      }
    },
    [commit],
  );

  // Keep a few batches loading ahead of her (and fill any gaps after a resume).
  useEffect(() => {
    if (exam.level === null) return;
    const missing: number[] = [];
    for (let p = 0; p < PARTS; p++) {
      if (exam.questions[p * EXAM_BATCH] == null && !failedParts.includes(p)) missing.push(p);
    }
    const slots = CONCURRENCY - loading.current.size;
    missing.filter((p) => !loading.current.has(p)).slice(0, Math.max(slots, 0)).forEach(loadPart);
  }, [exam, failedParts, loadPart]);

  function startExam() {
    loading.current.clear();
    setFailedParts([]);
    setOutcome(null);
    commit({
      level: progress.level,
      lang,
      startedAt: Date.now(),
      questions: Array(EXAM_QUESTIONS).fill(null),
      results: Array(EXAM_QUESTIONS).fill(null),
      index: 0,
    });
  }

  function finishExam(state: ExamState) {
    const level = state.level!;
    const entries = state.questions.flatMap((q, i) => {
      const r = state.results[i];
      if (!q || !r) return [];
      return [
        {
          topic: `Examen nivel ${level}`,
          type: q.type,
          skill: q.skill,
          instruction: q.instruction,
          prompt: q.prompt || q.spanish_audio,
          answer: r.answer,
          expected: r.grade.corrected || q.expected_answer,
          verdict: r.grade.verdict,
          points: r.points,
          feedback: r.grade.feedback,
        },
      ];
    });
    const out = recordExam(progress, level, entries);
    update(out.progress);
    setOutcome({ ...out, level });
    commit(noExam());
  }

  const L = levelInfo(progress.level);
  const days = levelStat(progress, progress.level).days.length;
  const inProgress = exam.level !== null;
  const answeredCount = exam.results.filter(Boolean).length;
  const q = inProgress ? exam.questions[exam.index] : null;
  const failedHere = inProgress && failedParts.includes(Math.floor(exam.index / EXAM_BATCH));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-28">
      <Header active="exam" />

      {outcome && (
        <section className="card space-y-4 text-center" data-testid="exam-result">
          <div className="text-7xl">{outcome.passed ? "🎓" : "💪"}</div>
          <h1 className="text-3xl font-extrabold">{outcome.passed ? t.examPassed(outcome.level) : t.examFailed}</h1>
          <p className="text-2xl">{t.examScore(Math.round(outcome.score * 100))}</p>
          <p className="text-lg">
            {outcome.passed ? t.examPassedBody(outcome.progress.level) : t.examFailedBody(Math.round(EXAM_PASS * 100))}
          </p>
          {outcome.bonus > 0 && <p className="text-xl font-bold text-good">{t.examBonus(outcome.bonus)}</p>}
          {outcome.badges.map((id) => {
            const b = badgeById(id);
            return b ? (
              <p key={id} className="rounded-2xl bg-warn-soft p-2 text-lg font-bold text-warn">
                {t.badgeNew(`${b.emoji} ${b.name[lang]}`)}
              </p>
            ) : null;
          })}
          <Link href="/" className="btn-primary w-full">
            {t.backHome}
          </Link>
        </section>
      )}

      {!outcome && !inProgress && (
        <section className="card space-y-4">
          <h1 className="text-3xl font-extrabold">🎓 {t.examTitle(L.n)}</h1>
          <p className="text-lg">
            {L.name[lang]} · {L.cefr}
          </p>
          <p>{t.examIntro(EXAM_QUESTIONS, Math.round(EXAM_PASS * 100))}</p>
          <p
            className={`rounded-2xl p-3 ${hasGraduated(progress, L.n) || examReady(progress, L.n) ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}
          >
            {hasGraduated(progress, L.n)
              ? t.examAlreadyPassed
              : examReady(progress, L.n)
                ? t.examReady
                : t.examEarly(Math.min(days, DAYS_TO_GRADUATE), DAYS_TO_GRADUATE)}
          </p>
          <button onClick={startExam} className="btn-primary w-full text-xl" data-testid="exam-start">
            {t.examStart}
          </button>
        </section>
      )}

      {!outcome && inProgress && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold">🎓 {t.examTitle(exam.level!)}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (window.confirm(t.examRestart + "?")) startExam();
                }}
                className="text-sm text-muted underline"
              >
                {t.examRestart}
              </button>
              <Link href="/" className="text-sm text-muted underline">
                {t.examPause}
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted">
            {answeredCount} / {EXAM_QUESTIONS} · {exam.questions.filter(Boolean).length} {lang === "en" ? "loaded" : "listas"}
          </p>
          {q ? (
            <QuestionCard
              key={`${exam.startedAt}-${exam.index}`}
              q={q}
              number={exam.index + 1}
              total={EXAM_QUESTIONS}
              level={exam.level!}
              context={lang === "en" ? `Level ${exam.level} exam` : `Examen nivel ${exam.level}`}
              result={exam.results[exam.index]}
              onResult={(r) => {
                const cur = examRef.current;
                const results = [...cur.results];
                results[cur.index] = r;
                commit({ ...cur, results });
              }}
              onNext={() => {
                const cur = examRef.current;
                if (cur.index + 1 >= EXAM_QUESTIONS) finishExam(cur);
                else commit({ ...cur, index: cur.index + 1 });
              }}
            />
          ) : failedHere ? (
            <div className="card space-y-3 text-center">
              <p className="text-bad">{t.examLoadError}</p>
              <button onClick={() => loadPart(Math.floor(exam.index / EXAM_BATCH))} className="btn-primary">
                {t.retry}
              </button>
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 py-12 text-center">
              <div className="animate-bounce text-5xl">📝</div>
              <p>{t.examLoadingQ}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
