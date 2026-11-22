"use client";
import { goToLogin } from "@/lib/nav";
// Saves per-user documents to the server (/api/state/*) with a localStorage copy,
// so progress follows her across devices and survives cleared browsers.
import { useSyncExternalStore } from "react";

export type Doc = "progress" | "exam" | "chat" | "photos";
type Stamped = { updatedAt?: number };

const cacheKey = (doc: Doc, name: string) => `sd_${doc}_v3:${name.toLowerCase()}`;

export function readCache<T>(doc: Doc, name: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(doc, name));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(doc: Doc, name: string, value: unknown) {
  try {
    localStorage.setItem(cacheKey(doc, name), JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server copy is still the source of truth.
  }
}

// ---- save status (shown in the header) ----
export type SyncStatus = "idle" | "saving" | "saved" | "offline";
let status: SyncStatus = "idle";
const listeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "idle" as SyncStatus,
  );
}

// ---- writes: one in flight per document, latest value wins, retried when back online ----
const latest = new Map<Doc, unknown>();
const inFlight = new Map<Doc, Promise<void>>();
const failed = new Set<Doc>();

// Called when the server holds a newer copy than the one we tried to save.
const conflictListeners = new Set<(doc: Doc, data: unknown) => void>();
export function onConflict(fn: (doc: Doc, data: unknown) => void) {
  conflictListeners.add(fn);
  return () => conflictListeners.delete(fn);
}

async function put(doc: Doc, value: unknown): Promise<boolean> {
  try {
    const res = await fetch(`/api/state/${doc}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (res.status === 401) {
      goToLogin();
      return false;
    }
    if (res.status === 409) {
      // A newer copy exists (another tab or device): keep it instead of ours.
      const { data } = await res.json().catch(() => ({ data: null }));
      if (data) conflictListeners.forEach((fn) => fn(doc, data));
      return true;
    }
    return res.ok;
  } catch {
    return false;
  }
}

function pump(doc: Doc) {
  if (inFlight.has(doc)) return;
  const run = (async () => {
    while (latest.has(doc)) {
      const value = latest.get(doc);
      latest.delete(doc);
      setStatus("saving");
      const ok = await put(doc, value);
      if (!ok) {
        if (!latest.has(doc)) latest.set(doc, value); // keep the newest unsaved value
        failed.add(doc);
        setStatus("offline");
        return;
      }
      failed.delete(doc);
    }
    setStatus(failed.size ? "offline" : "saved");
  })().finally(() => inFlight.delete(doc));
  inFlight.set(doc, run);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => [...latest.keys()].forEach(pump));
}

/** Saves locally right away and to the server in the background. */
export function saveDoc<T extends Stamped>(doc: Doc, name: string, value: T): T {
  const stamped = { ...value, updatedAt: Date.now() };
  writeCache(doc, name, stamped);
  latest.set(doc, stamped);
  pump(doc);
  return stamped;
}

/** Retries anything that failed to save (e.g. when the page regains focus). */
export function retryPending() {
  [...latest.keys()].forEach(pump);
}

/**
 * Loads the newest copy: the server's, unless this device has newer unsaved
 * changes (then those are pushed up).
 */
export async function loadDoc<T extends Stamped>(doc: Doc, name: string): Promise<T | null> {
  const local = readCache<T>(doc, name);
  try {
    const res = await fetch(`/api/state/${doc}`, { cache: "no-store" });
    if (res.status === 401) {
      goToLogin();
      return local;
    }
    if (!res.ok) throw new Error(String(res.status));
    const { data } = (await res.json()) as { data: T | null };
    const lu = local?.updatedAt ?? -1;
    const su = data?.updatedAt ?? -1;
    if (data && su >= lu) {
      writeCache(doc, name, data);
      return data;
    }
    if (local && lu > su) {
      latest.set(doc, local);
      pump(doc);
      return local;
    }
    return data ?? local;
  } catch {
    setStatus("offline");
    return local;
  }
}
