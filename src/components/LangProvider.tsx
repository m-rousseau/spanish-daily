"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/topics";
import { STRINGS, type Strings } from "./strings";

const KEY = "sd_lang";

export function savedLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

const Ctx = createContext<{ lang: Lang; t: Strings; setLang: (l: Lang) => void }>({
  lang: "es",
  t: STRINGS.es,
  setLang: () => {},
});

// Rendered inside client-only trees, so reading localStorage in the initializer is safe.
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(savedLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    document.documentElement.lang = l;
  };
  return <Ctx.Provider value={{ lang, t: STRINGS[lang], setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex overflow-hidden rounded-xl border-2 border-border text-sm font-bold" role="group" aria-label="Language">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2 py-1 ${lang === l ? "bg-accent text-white" : "bg-card"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
