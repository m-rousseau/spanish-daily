import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HistoryLoader } from "@/components/PracticeLoader";

async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <HistoryLoader name={session.name} />;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-4xl">📖</main>}>
      <HistoryPage />
    </Suspense>
  );
}
