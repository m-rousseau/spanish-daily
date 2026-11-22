"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LangProvider, LangToggle, useLang } from "@/components/LangProvider";

export default function LoginPage() {
  return (
    <LangProvider>
      <LoginForm />
    </LangProvider>
  );
}

function LoginForm() {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), password: form.get("password") }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh(); // re-render server components with the new session cookie
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t.loginError);
    } catch {
      setError(t.loginOffline);
    }
    setPending(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-5">
        <div className="flex justify-end">
          <LangToggle />
        </div>
        <div className="text-center">
          <div className="text-5xl">🌞</div>
          <h1 className="mt-2 text-3xl font-bold">¡Buenos días!</h1>
          <p className="mt-1 text-muted">{t.loginSubtitle}</p>
        </div>
        <label className="block">
          <span className="label">{t.loginName}</span>
          <input name="name" autoComplete="username" autoCapitalize="none" required className="input" />
        </label>
        <label className="block">
          <span className="label">{t.loginPassword}</span>
          <input name="password" type="password" autoComplete="current-password" required className="input" />
        </label>
        {error && (
          <p className="text-bad" role="alert">
            {error}
          </p>
        )}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "…" : t.loginButton}
        </button>
      </form>
    </main>
  );
}
