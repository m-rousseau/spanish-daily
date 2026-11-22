"use client";
import { emptyProgress, normalizeProgress, type Progress } from "./progress";
import { useDoc } from "./docStore";

/** Progress saved by earlier versions of the app (browser-only storage). */
function legacyProgress(name: string): Progress | null {
  try {
    for (const key of [`sd_progress_v2:${name.toLowerCase()}`, `sd_progress_v1:${name.toLowerCase()}`]) {
      const raw = localStorage.getItem(key);
      if (raw) return normalizeProgress({ ...JSON.parse(raw), updatedAt: 1 });
    }
  } catch {}
  return null;
}

/** Her progress, shared by every page: instant from this device's copy, refreshed from the server. */
export function useProgress(name: string) {
  const { value, update, loaded } = useDoc<Progress>("progress", name, {
    initial: () => legacyProgress(name) ?? emptyProgress(),
    normalize: normalizeProgress,
    onEmpty: () => legacyProgress(name),
  });
  return { progress: value, update, loaded };
}
