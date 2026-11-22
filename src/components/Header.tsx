"use client";
import Link from "next/link";
import { useSyncStatus } from "@/lib/sync";
import { LangToggle, useLang } from "./LangProvider";

export default function Header({ active }: { active: "practice" | "history" | "exam" | "photos" }) {
  const { t, lang } = useLang();
  const status = useSyncStatus();
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-xl px-1 py-1.5 text-center text-[15px] font-bold sm:px-3 sm:text-base ${on ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
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
      <nav className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
        {link("/", t.practice, active === "practice")}
        {link("/examen", `🎓 ${t.exam}`, active === "exam")}
        {link("/historia", t.history, active === "history")}
        {link("/fotos", `📸 ${t.photos}`, active === "photos")}
      </nav>
    </header>
  );
}
