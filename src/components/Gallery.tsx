"use client";
import { useEffect, useRef, useState } from "react";
import { usePhotos, type PhotoInfo } from "@/lib/usePhotos";
import { useLang } from "./LangProvider";
import Header from "./Header";

export default function Gallery({ name }: { name: string }) {
  const { t } = useLang();
  const { photos, configured, loading, error, isNew, markSeen } = usePhotos(name);
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  // Remember the newest "new" set for this visit, then mark them seen.
  const [newIds] = useState(() => new Set<string>());

  useEffect(() => {
    if (loading || !photos.length) return;
    photos.filter(isNew).forEach((p) => newIds.add(p.id));
    markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the list arrives
  }, [loading]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : Math.min(i + 1, photos.length - 1)));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  const dateOf = (p: PhotoInfo) =>
    new Date(p.takenTime ?? p.createdTime).toLocaleDateString(t.dateLocale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-28">
      <Header active="photos" />
      <h1 className="mb-4 text-3xl font-extrabold">{t.photosTitle}</h1>

      {loading ? (
        <p className="card text-center text-muted">{t.photosLoading}</p>
      ) : !configured ? (
        <p className="card text-center text-muted">{t.photosNotSetUp}</p>
      ) : error && !photos.length ? (
        <p className="card text-center text-bad">{t.photosError}</p>
      ) : !photos.length ? (
        <p className="card text-center text-muted">{t.photosEmpty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setOpen(i)}
              className="relative aspect-square overflow-hidden rounded-2xl bg-border"
              aria-label={dateOf(p)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private images served by our own API */}
              <img src={`/api/photos/${p.id}?size=thumb`} alt={dateOf(p)} loading="lazy" className="h-full w-full object-cover" />
              {newIds.has(p.id) && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-sm font-bold text-white">
                  {t.photosNewTag}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open !== null && photos[open] && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black"
          role="dialog"
          aria-label={dateOf(photos[open])}
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-base">{dateOf(photos[open])}</span>
            <button className="px-3 text-3xl leading-none" aria-label={t.close} onClick={() => setOpen(null)}>
              ×
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -50) setOpen((i) => (i === null ? i : Math.min(i + 1, photos.length - 1)));
              if (dx > 50) setOpen((i) => (i === null ? i : Math.max(i - 1, 0)));
              touchX.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- private images served by our own API */}
            <img
              key={photos[open].id}
              src={`/api/photos/${photos[open].id}?size=large`}
              alt={dateOf(photos[open])}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </div>
          <div className="flex justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <button className="btn-ghost flex-1" disabled={open === 0} onClick={() => setOpen(open - 1)}>
              ← {t.photosPrev}
            </button>
            <button className="btn-ghost flex-1" disabled={open === photos.length - 1} onClick={() => setOpen(open + 1)}>
              {t.photosNext} →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
