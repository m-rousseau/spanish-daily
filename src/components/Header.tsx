"use client";
import Link from "next/link";
import { useSyncStatus } from "@/lib/sync";
import { LangToggle, useLang } from "./LangProvider";

export default function Header({ active }: { active: "practice" | "history" | "exam" }) {
  const { t, lang } = useLang();
  const status = useSyncStatus();
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-xl px-2 py-1 text-base font-bold sm:px-3 ${on ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
  const statusText =
    status === "saving" ? "☁️ …" : status === "offline" ? (lang === "en" ? "⚠️ offline" : "⚠️ sin conexión") : status === "saved" ? "☁️ ✓" : "";
  return (
    <header className="mb-6 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="whitespace-nowrap text-lg font-bold">
          🌞 <span className="hidden sm:inline">Español diario</span>
        </Link>
        <div className="flex items-center gap-2">
          {statusText && (
            <span className="text-xs text-muted" title={status} data-sync={status}>
              {statusText}
            </span>
          )}
          <LangToggle />
          <form method="post" action="/api/logout">
            <button className="px-1 py-1 text-sm text-muted underline">{t.logout}</button>
          </form>
        </div>
      </div>
      <nav className="flex items-center gap-1">
        {link("/", t.practice, active === "practice")}
        {link("/examen", `🎓 ${t.exam}`, active === "exam")}
        {link("/historia", t.history, active === "history")}
      </nav>
    </header>
  );
}
