import { z } from "zod";
import { checkCredentials, createSession } from "@/lib/session";
import { log } from "@/lib/log";

// Login is a plain route handler (not a Server Action) so a page left open
// across a redeploy can still log in.
const Body = z.object({ name: z.string().max(100), password: z.string().max(200) });

// Failed attempts per (address, name) and per name, in a rolling window. The site is on the
// public internet, so guessing is capped: 10 tries per device and 50 in all per name, per 15 min.
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, number[]>();
function recent(key: string) {
  const now = Date.now();
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const name = parsed.success ? parsed.data.name.trim().toLowerCase().slice(0, 40) : "";
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const keys = [`ip:${ip}|${name}`, `name:${name}`];
  if (recent(keys[0]).length >= 10 || recent(keys[1]).length >= 50) {
    log("login.locked", { name, ip });
    return Response.json({ error: "Demasiados intentos. Espera 15 minutos, por favor." }, { status: 429 });
  }
  const display = parsed.success ? checkCredentials(parsed.data.name, parsed.data.password) : null;
  if (!display) {
    if (failures.size > 10_000) failures.clear(); // bounded memory under a flood of made-up names
    for (const k of keys) failures.set(k, [...recent(k), Date.now()]);
    log("login.fail", { name: parsed.success ? name : null, ip });
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Nombre o contraseña incorrectos." }, { status: 401 });
  }
  failures.delete(keys[0]);
  await createSession(display);
  log("login.ok", { user: display });
  return Response.json({ ok: true });
}
