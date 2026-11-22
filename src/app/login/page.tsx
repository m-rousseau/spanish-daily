"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-5xl">🌞</div>
          <h1 className="mt-2 text-3xl font-bold">¡Buenos días!</h1>
          <p className="mt-1 text-muted">Español diario · 5 minutos al día</p>
        </div>
        <label className="block">
          <span className="label">Nombre</span>
          <input name="name" autoComplete="username" required className="input" />
        </label>
        <label className="block">
          <span className="label">Contraseña</span>
          <input name="password" type="password" autoComplete="current-password" required className="input" />
        </label>
        {error && <p className="text-bad" role="alert">{error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
