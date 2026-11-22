"use client";
// One shared in-memory copy per saved document (progress, chat), used by every
// page. Next.js keeps visited pages alive in the background; without a shared
// copy, a page left open would hold old data and could save it over newer data.
import { useEffect, useSyncExternalStore } from "react";
import { loadDoc, onConflict, readCache, saveDoc, writeCache, type Doc } from "./sync";

type Stamped = { updatedAt?: number };

type Store<T> = {
  name: string;
  value: T;
  loaded: boolean;
  loading: Promise<void> | null;
  listeners: Set<() => void>;
};

const stores = new Map<string, Store<unknown>>();
const normalizers = new Map<string, (raw: unknown) => unknown>();

// The server refused a stale save and sent its newer copy: show that one everywhere.
if (typeof window !== "undefined") {
  onConflict((doc, data) => {
    for (const [key, s] of stores) {
      if (!key.startsWith(`${doc}:`)) continue;
      const normalize = normalizers.get(key) ?? ((x: unknown) => x);
      s.value = normalize(data);
      writeCache(doc, s.name, s.value);
      emit(s);
    }
  });
}

function getStore<T>(doc: Doc, name: string, init: () => T): Store<T> {
  const key = `${doc}:${name.toLowerCase()}`;
  let s = stores.get(key) as Store<T> | undefined;
  if (!s) {
    s = { name, value: init(), loaded: false, loading: null, listeners: new Set() };
    stores.set(key, s as Store<unknown>);
  }
  return s;
}

function emit<T>(s: Store<T>) {
  s.listeners.forEach((l) => l());
}

/** Pull the newest copy from the server (newer local edits are pushed up instead). */
function refresh<T extends Stamped>(doc: Doc, s: Store<T>, normalize: (raw: unknown) => T, onEmpty?: () => T | null) {
  if (s.loading) return s.loading;
  s.loading = loadDoc<T>(doc, s.name)
    .then((data) => {
      if (data) {
        const next = normalize(data);
        if ((next.updatedAt ?? 0) >= ((s.value as Stamped).updatedAt ?? 0)) s.value = next;
      } else if (onEmpty) {
        const seeded = onEmpty();
        if (seeded) s.value = saveDoc(doc, s.name, seeded);
      }
      s.loaded = true;
      emit(s);
    })
    .finally(() => {
      s.loading = null;
    });
  return s.loading;
}

/** Saves a new value (locally and to the server) and updates every page showing it. */
function setDoc<T extends Stamped>(doc: Doc, name: string, next: T) {
  const s = stores.get(`${doc}:${name.toLowerCase()}`) as Store<T> | undefined;
  if (!s) return;
  s.value = saveDoc(doc, s.name, next);
  emit(s);
}

export function useDoc<T extends Stamped>(
  doc: Doc,
  name: string,
  opts: { initial: () => T; normalize: (raw: unknown) => T; onEmpty?: () => T | null },
) {
  normalizers.set(`${doc}:${name.toLowerCase()}`, opts.normalize);
  const s = getStore<T>(doc, name, () => {
    const cached = readCache<T>(doc, name);
    return cached ? opts.normalize(cached) : opts.initial();
  });

  const value = useSyncExternalStore(
    (l) => {
      s.listeners.add(l);
      return () => s.listeners.delete(l);
    },
    () => s.value,
    () => s.value,
  );

  useEffect(() => {
    if (!s.loaded) refresh(doc, s, opts.normalize, opts.onEmpty);
    // Coming back to the app (other tab, phone unlocked, another device used meanwhile): refresh.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh(doc, s, opts.normalize);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one store per doc/name
  }, [doc, name]);

  const update = (next: T) => setDoc(doc, name, next);

  return { value, update, loaded: s.loaded };
}
