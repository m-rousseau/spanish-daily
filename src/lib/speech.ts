"use client";
// Browser speech helpers. Text-to-speech works in all modern browsers;
// speech recognition works in Chrome, Edge and Safari (not Firefox).

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => recognitionCtor() !== null;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function spanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "es-MX") ??
    voices.find((v) => v.lang === "es-US") ??
    voices.find((v) => v.lang.startsWith("es"))
  );
}

export function speak(text: string, slow = false) {
  if (!canSpeak() || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-MX";
  const voice = spanishVoice();
  if (voice) u.voice = voice;
  u.rate = slow ? 0.6 : 0.9;
  window.speechSynthesis.speak(u);
}

/** Starts listening in Spanish. Returns a stop function. */
export function listen(handlers: {
  onText: (text: string, final: boolean) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("unsupported");
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = "es-MX";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onText((finalText + interim).trim(), interim === "");
  };
  rec.onerror = (e) => handlers.onError(e.error);
  rec.onend = handlers.onEnd;
  rec.start();
  return () => rec.stop();
}
