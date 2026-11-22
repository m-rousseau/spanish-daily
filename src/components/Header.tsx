"use client";
import Link from "next/link";
import { t } from "./strings";

export default function Header({ active }: { active: "practice" | "history" }) {
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-xl px-3 py-1 text-base font-bold ${on ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="mb-6 flex items-center justify-between gap-2">
      <Link href="/" className="whitespace-nowrap text-lg font-bold">
        🌞 <span className="hidden sm:inline">Español diario</span>
      </Link>
      <nav className="flex items-center gap-1">
        {link("/", t.practice, active === "practice")}
        {link("/historia", t.history, active === "history")}
        <form method="post" action="/api/logout">
          <button className="px-2 py-1 text-base text-muted underline">{t.logout}</button>
        </form>
      </nav>
    </header>
  );
}
