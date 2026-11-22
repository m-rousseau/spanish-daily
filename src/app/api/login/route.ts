import { z } from "zod";
import { checkCredentials, createSession } from "@/lib/session";

// Login is a plain route handler (not a Server Action) so a page left open
// across a redeploy can still log in.
const Body = z.object({ name: z.string().max(100), password: z.string().max(200) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const display = parsed.success ? checkCredentials(parsed.data.name, parsed.data.password) : null;
  if (!display) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Nombre o contraseña incorrectos." }, { status: 401 });
  }
  await createSession(display);
  return Response.json({ ok: true });
}
