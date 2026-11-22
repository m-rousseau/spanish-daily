"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Grade, Question, Verdict } from "@/lib/types";
import { pointsFor } from "@/lib/scoring";
import { canListen, canSpeak, listen, speak } from "@/lib/speech";
import { useLang } from "./LangProvider";
import { setScreen } from "@/lib/screen";

const GeoMap = dynamic(() => import("./GeoMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-border sm:h-80" />,
});

export type Result = { answer: string; grade: Grade; points: number };

export function verdictIcon(v?: Verdict) {
  return v === "correct" ? "✅" : v === "almost" ? "🟡" : "❌";
}

export default function QuestionCard({
  q,
  number,
  total,
  level,
  context,
  result,
  onResult,
  onNext,
}: {
  q: Question;
  number: number;
  total: number;
  level: number;
  context: string; // e.g. "Práctica" or "Examen nivel 2", for the tutor
  result: Result | null;
  onResult: (r: Result) => void;
  onNext: () => void;
}) {
  const { t } = useLang();
  const answered = result !== null;

  // Tell the tutor chat what's on screen.
  useEffect(() => {
    setScreen({ label: `${context} · ${number}/${total}`, text: describeForTutor(q, result) });
  }, [q, result, number, total, context]);
  useEffect(() => () => setScreen(null), []);
  const fun = q.type === "geo" || q.type === "news";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((number - 1) / total) * 100}%` }} />
        </div>
        <span className="text-base font-bold text-muted">
          {number} {t.of} {total}
        </span>
      </div>

      <div className={`card space-y-5 ${fun ? "border-2 border-accent" : ""}`}>
        {fun && <p className="text-sm font-extrabold uppercase tracking-wide text-accent">{t.bonusRound}</p>}
        <p className="text-lg font-semibold text-muted">{q.instruction}</p>
        {q.type === "geo" ? (
          <GeoBody q={q} result={result} onResult={onResult} />
        ) : q.type === "multiple_choice" || q.type === "news" ? (
          <ChoiceBody q={q} result={result} onResult={onResult} />
        ) : (
          <FreeBody q={q} level={level} result={result} onResult={onResult} />
        )}
      </div>

      {answered && (
        <button onClick={onNext} className="btn-primary w-full text-xl">
          {number < total ? t.next : t.finish} →
        </button>
      )}
    </section>
  );
}

function Choices({
  choices,
  correct,
  picked,
  onPick,
}: {
  choices: string[];
  correct: number;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  const done = picked !== null;
  return (
    <div className="grid gap-3">
      {choices.map((c, i) => {
        const style = !done
          ? "border-border bg-card hover:border-accent"
          : i === correct
            ? "border-good bg-good-soft"
            : i === picked
              ? "border-bad bg-bad-soft"
              : "border-border bg-card opacity-60";
        return (
          <button
            key={i}
            onClick={() => !done && onPick(i)}
            disabled={done}
            className={`rounded-2xl border-2 px-4 py-3 text-left text-xl font-semibold transition ${style}`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

type BodyProps = { q: Question; result: Result | null; onResult: (r: Result) => void };

function describeForTutor(q: Question, result: Result | null): string {
  const lines = [
    `Type: ${q.type}; skill: ${q.skill}`,
    `Instruction: ${q.instruction}`,
    q.prompt ? `Prompt: ${q.prompt}` : "",
    q.type === "listening" ? `Audio she hears: ${q.spanish_audio}` : "",
    q.choices.length ? `Choices: ${q.choices.map((c, i) => `${i + 1}) ${c}`).join("  ")}` : "",
    q.geo ? `Place shown on the satellite map: ${q.geo.place}, ${q.geo.country}. Second part: ${q.geo.known_for_prompt} ${q.geo.known_for_choices.join(" / ")}` : "",
    q.news ? `Based on the headline: ${q.news.title} (${q.news.source})` : "",
    `Correct answer: ${q.expected_answer}`,
    result
      ? `She answered: «${result.answer}» → ${result.grade.verdict}. Feedback shown: ${result.grade.feedback}`
      : "She has NOT answered yet.",
  ];
  return lines.filter(Boolean).join("\n");
}

function ChoiceBody({ q, result, onResult }: BodyProps) {
  const picked = result ? q.choices.indexOf(result.answer) : null;
  return (
    <>
      {q.prompt && <p className="text-2xl font-bold leading-snug">{q.prompt}</p>}
      <Choices
        choices={q.choices}
        correct={q.correct_index}
        picked={picked}
        onPick={(i) => {
          const verdict: Verdict = i === q.correct_index ? "correct" : "incorrect";
          onResult({
            answer: q.choices[i],
            points: pointsFor(q.type, verdict),
            grade: { verdict, feedback: q.explanation, corrected: q.choices[q.correct_index] ?? q.expected_answer },
          });
        }}
      />
      {result && <Feedback q={q} result={result} />}
    </>
  );
}

function GeoBody({ q, result, onResult }: BodyProps) {
  const geo = q.geo!;
  const [first, setFirst] = useState<number | null>(null);
  return (
    <>
      <GeoMap lat={geo.lat} lon={geo.lon} zoom={geo.zoom} revealed={result !== null} />
      <Choices choices={q.choices} correct={q.correct_index} picked={first} onPick={setFirst} />
      {first !== null && (
        <>
          <p className="pt-2 text-2xl font-bold leading-snug">{geo.known_for_prompt}</p>
          <Choices
            choices={geo.known_for_choices}
            correct={geo.known_for_index}
            picked={result ? geo.known_for_choices.indexOf(result.answer.split(" · ")[1] ?? "") : null}
            onPick={(i) => {
              const parts: [boolean, boolean] = [first === q.correct_index, i === geo.known_for_index];
              const verdict: Verdict = parts[0] && parts[1] ? "correct" : parts[0] || parts[1] ? "almost" : "incorrect";
              onResult({
                answer: `${q.choices[first]} · ${geo.known_for_choices[i]}`,
                points: pointsFor("geo", verdict, parts),
                grade: {
                  verdict,
                  feedback: q.explanation,
                  corrected: `${geo.place}, ${geo.country} · ${geo.known_for_choices[geo.known_for_index] ?? ""}`,
                },
              });
            }}
          />
        </>
      )}
      {result && <Feedback q={q} result={result} />}
    </>
  );
}

function FreeBody({ q, level, result, onResult }: BodyProps & { level: number }) {
  const { t, lang } = useLang();
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [typeMode, setTypeMode] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const [speechOk] = useState(() => ({ listen: canListen(), speak: canSpeak() }));
  const answered = result !== null;
  const isSpeaking = q.type === "speaking" && speechOk.listen && !typeMode;

  useEffect(() => {
    if (q.type === "listening") speak(q.spanish_audio);
    return () => stopRef.current();
  }, [q]);

  async function check(text: string) {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          lang,
          question: {
            type: q.type,
            instruction: q.instruction,
            prompt: q.prompt,
            spanish_audio: q.spanish_audio,
            expected_answer: q.expected_answer,
          },
          answer: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onResult({ answer: text, grade: data, points: pointsFor(q.type, data.verdict) });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Error");
    } finally {
      setChecking(false);
    }
  }

  function toggleMic() {
    if (recording) return stopRef.current();
    setMicError(null);
    setAnswer("");
    setRecording(true);
    stopRef.current = listen({
      onText: (text) => setAnswer(text),
      onEnd: () => setRecording(false),
      onError: (err) => {
        setRecording(false);
        if (err === "not-allowed" || err === "service-not-allowed") setMicError(t.micDenied);
        else if (err === "unsupported") setMicError(t.noMic);
        // "no-speech" / "aborted": she can just try again
      },
    });
  }

  return (
    <>
      {q.prompt && <p className="text-2xl font-bold leading-snug">{q.prompt}</p>}
      {(q.type === "listening" || (q.type === "speaking" && answered)) && speechOk.speak && (
        <div className="flex gap-2">
          <button onClick={() => speak(q.spanish_audio)} className="btn-ghost">
            🔊 {t.listen}
          </button>
          <button onClick={() => speak(q.spanish_audio, true)} className="btn-ghost">
            🐢 {t.slow}
          </button>
        </div>
      )}

      {!answered && (
        <div className="space-y-3">
          {isSpeaking ? (
            <>
              <button
                onClick={toggleMic}
                className={`btn w-full py-6 text-xl text-white ${recording ? "animate-pulse bg-bad" : "bg-accent"}`}
              >
                {recording ? `⏹ ${t.stop} — ${t.listening}` : `🎤 ${t.speakNow}`}
              </button>
              {answer && (
                <p className="rounded-2xl bg-background p-3 text-xl">
                  <span className="text-base text-muted">{t.heard}</span> {answer}
                </p>
              )}
              {micError && <p className="text-bad">{micError}</p>}
            </>
          ) : (
            <>
              {q.type === "speaking" && !speechOk.listen && <p className="text-base text-muted">{t.noMic}</p>}
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && answer.trim() && !checking && check(answer)}
                placeholder={t.yourAnswer}
                className="input"
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                lang="es"
                maxLength={500}
              />
              <AccentKeys onKey={(ch) => setAnswer((a) => a + ch)} />
            </>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {!showHint && q.hint && (
              <button onClick={() => setShowHint(true)} className="text-base text-muted underline">
                💡 {t.hint}
              </button>
            )}
            {isSpeaking && (
              <button onClick={() => setTypeMode(true)} className="text-base text-muted underline">
                ⌨️ {t.typeInstead}
              </button>
            )}
          </div>
          {showHint && <p className="rounded-2xl bg-warn-soft p-3 text-warn">💡 {q.hint}</p>}
          {error && <p className="text-bad">{error}</p>}
          <button onClick={() => check(answer)} disabled={!answer.trim() || checking || recording} className="btn-primary w-full">
            {checking ? "…" : t.check}
          </button>
        </div>
      )}
      {result && <Feedback q={q} result={result} />}
    </>
  );
}

function Feedback({ q, result }: { q: Question; result: Result }) {
  const { t } = useLang();
  const v = result.grade.verdict;
  const tone = v === "correct" ? "bg-good-soft text-good" : v === "almost" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad";
  const choice = q.type === "multiple_choice" || q.type === "news";
  return (
    <div className={`space-y-2 rounded-2xl p-4 ${tone}`} role="status">
      <p className="flex items-center justify-between gap-2 text-xl font-extrabold">
        <span>
          {verdictIcon(v)} {t[v]}
        </span>
        {result.points > 0 && <span className="text-lg">{t.plus(result.points)}</span>}
      </p>
      {!choice && q.type !== "geo" && (
        <p className="text-foreground">
          <span className="text-muted">{t.you}</span> {result.answer}
        </p>
      )}
      <p className="text-foreground">{result.grade.feedback}</p>
      {!choice && result.grade.corrected && q.type !== "geo" && (
        <p className="flex items-center gap-2 text-foreground">
          <span className="text-muted">{t.answer}</span>
          <strong className="text-xl">{result.grade.corrected}</strong>
          <button onClick={() => speak(result.grade.corrected)} aria-label={t.listen} className="text-xl">
            🔊
          </button>
        </p>
      )}
      {q.type === "geo" && q.geo && (
        <p className="text-foreground">
          📍 <strong>
            {q.geo.place}, {q.geo.country}
          </strong>
        </p>
      )}
      {!choice && q.type !== "geo" && q.explanation && v !== "correct" && (
        <p className="text-base text-foreground opacity-80">{q.explanation}</p>
      )}
      {q.news && (
        <a
          href={q.news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl bg-card p-3 text-base text-foreground underline-offset-2 hover:underline"
        >
          📰 <strong>{q.news.title}</strong>
          <br />
          <span className="text-muted">
            {q.news.source} · {t.readMore} ↗
          </span>
        </a>
      )}
    </div>
  );
}

function AccentKeys({ onKey }: { onKey: (ch: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onKey(ch)}
          className="h-11 w-11 rounded-xl border-2 border-border bg-card text-xl font-bold hover:border-accent"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
