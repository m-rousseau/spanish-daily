"use client";
import { useCallback, useEffect, useState } from "react";
import { emptyProgress, normalizeProgress, type Progress } from "./progress";
import { loadDoc, readCache, saveDoc } from "./sync";

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

function initial(name: string): Progress {
  const cached = readCache<Progress>("progress", name);
  return cached ? normalizeProgress(cached) : (legacyProgress(name) ?? emptyProgress());
}

/** Her progress: instant from this device's copy, then refreshed from the server. */
export function useProgress(name: string) {
  const [progress, setProgress] = useState<Progress>(() => initial(name));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDoc<Progress>("progress", name).then((data) => {
      if (!alive) return;
      if (data) {
        setProgress(normalizeProgress(data));
      } else {
        // Nothing saved anywhere yet in the new format: upload what older versions kept in the browser.
        const legacy = legacyProgress(name);
        if (legacy) setProgress(saveDoc("progress", name, legacy));
      }
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [name]);

  const update = useCallback((next: Progress) => setProgress(saveDoc("progress", name, next)), [name]);
  return { progress, update, loaded };
}
