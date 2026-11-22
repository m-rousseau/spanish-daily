"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { emptyProgress, type Progress } from "@/lib/progress";
import { useProgress } from "@/lib/useProgress";
import { retryPending } from "@/lib/sync";
import { LangProvider } from "./LangProvider";
import ChatWidget from "./ChatWidget";

const ProgressCtx = createContext<{ progress: Progress; update: (p: Progress) => void; loaded: boolean }>({
  progress: emptyProgress(),
  update: () => {},
  loaded: false,
});

export const useAppProgress = () => useContext(ProgressCtx);

/** Language, synced progress and the always-available tutor, shared by every page. */
export default function AppShell({ name, children }: { name: string; children: ReactNode }) {
  const value = useProgress(name);

  useEffect(() => {
    const onFocus = () => retryPending();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <LangProvider>
      <ProgressCtx.Provider value={value}>
        {children}
        <ChatWidget name={name} progress={value.progress} />
      </ProgressCtx.Provider>
    </LangProvider>
  );
}
