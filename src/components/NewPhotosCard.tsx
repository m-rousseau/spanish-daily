"use client";
import Link from "next/link";
import { usePhotos } from "@/lib/usePhotos";
import { useLang } from "./LangProvider";

/** Home-page nudge when the family added photos since her last look. */
export default function NewPhotosCard({ name }: { name: string }) {
  const { t } = useLang();
  const { photos, newCount, configured, loading } = usePhotos(name);
  if (loading || !configured || newCount === 0) return null;
  const preview = photos.slice(0, Math.min(newCount, 3));
  return (
    <Link href="/fotos" className="card flex items-center gap-3 border-2 border-accent hover:brightness-105" data-testid="new-photos">
      <div className="flex -space-x-4">
        {preview.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element -- private images served by our own API
          <img key={p.id} src={`/api/photos/${p.id}?size=thumb`} alt="" className="h-14 w-14 rounded-xl border-2 border-card object-cover" />
        ))}
      </div>
      <div className="flex-1">
        <div className="text-lg font-extrabold">{t.photosNew(newCount)}</div>
        <div className="text-base text-accent">{t.photosSee} →</div>
      </div>
    </Link>
  );
}
