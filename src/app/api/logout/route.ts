import { destroySession } from "@/lib/session";

// Plain HTML form POST target (works even from a page loaded before a redeploy).
// Relative Location: behind Tailscale Funnel the server only sees its container
// address (0.0.0.0:3000), so an absolute URL built from request.url is wrong.
export async function POST() {
  await destroySession();
  return new Response(null, { status: 303, headers: { Location: "/login" } });
}
