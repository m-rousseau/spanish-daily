import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "sd_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // stay logged in for 60 days

export type Session = { name: string };

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/** APP_USERS="Maman:some-password,Marc:other-password" */
function configuredUsers(): Map<string, string> {
  const users = new Map<string, string>();
  for (const pair of (process.env.APP_USERS ?? "").split(",")) {
    const idx = pair.indexOf(":");
    if (idx <= 0) continue;
    users.set(pair.slice(0, idx).trim().toLowerCase(), pair.slice(idx + 1).trim());
  }
  return users;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Short fingerprint of a user's current password, stored in the session. Changing
 * the password (or removing the user) in APP_USERS ends that user's open sessions.
 */
function passwordVersion(name: string): string | null {
  const pw = configuredUsers().get(name.trim().toLowerCase());
  if (pw === undefined) return null;
  return createHmac("sha256", secretKey()).update(`pv:${pw}`).digest("base64url").slice(0, 16);
}

/** Returns the canonical display name if the credentials are valid. */
export function checkCredentials(name: string, password: string): string | null {
  const key = name.trim().toLowerCase();
  const expected = configuredUsers().get(key);
  if (!expected || !safeEqual(password, expected)) return null;
  // Use the name as written in APP_USERS for display.
  const display = (process.env.APP_USERS ?? "")
    .split(",")
    .map((p) => p.split(":")[0].trim())
    .find((n) => n.toLowerCase() === key);
  return display ?? name.trim();
}

export async function createSession(name: string) {
  const token = await new SignJWT({ name, pv: passwordVersion(name) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifyToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.name !== "string") return null;
    const pv = passwordVersion(payload.name);
    if (!pv || payload.pv !== pv) return null; // user removed or password changed since this login
    return { name: payload.name };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}
