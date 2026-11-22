import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic gate: send logged-out visitors to /login. API routes also
// verify the session themselves (see requireSession in each route).
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("sd_session")?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      ok = true;
    } catch {}
  }
  if (ok) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except the login page and static assets.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
