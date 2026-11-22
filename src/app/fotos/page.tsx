import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { GalleryLoader } from "@/components/PracticeLoader";

async function PhotosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <GalleryLoader name={session.name} />;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-4xl">📸</main>}>
      <PhotosPage />
    </Suspense>
  );
}
