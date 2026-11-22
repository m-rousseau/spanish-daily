import { destroySession } from "@/lib/session";

// Plain HTML form POST target (works even from a page loaded before a redeploy).
export async function POST(request: Request) {
  await destroySession();
  return Response.redirect(new URL("/login", request.url), 303);
}
