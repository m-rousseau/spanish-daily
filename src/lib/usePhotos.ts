"use client";
import { useCallback, useEffect, useState } from "react";
import { loadDoc, readCache, saveDoc } from "./sync";

export type PhotoInfo = { id: string; name: string; createdTime: string; takenTime: string | null; width: number; height: number };
type PhotosDoc = { updatedAt?: number; lastSeen: string | null };

/** Photos from the family Drive folder, and which ones are new since her last visit to the gallery. */
export function usePhotos(name: string) {
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(() => readCache<PhotosDoc>("photos", name)?.lastSeen ?? null);

  useEffect(() => {
    let alive = true;
    loadDoc<PhotosDoc>("photos", name).then((d) => alive && d && setLastSeen(d.lastSeen));
    fetch("/api/photos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setConfigured(data.configured !== false);
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
        setError(Boolean(data.error));
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [name]);

  const isNew = useCallback((p: PhotoInfo) => !lastSeen || p.createdTime > lastSeen, [lastSeen]);
  const newCount = photos.filter(isNew).length;

  const markSeen = useCallback(() => {
    const newest = photos[0]?.createdTime;
    if (newest && newest !== lastSeen) saveDoc<PhotosDoc>("photos", name, { lastSeen: newest });
  }, [photos, lastSeen, name]);

  return { photos, configured, loading, error, isNew, newCount, markSeen };
}
