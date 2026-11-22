import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TOPIC_IDS, type TopicId } from "@/lib/topics";
import { PracticeLoader } from "@/components/PracticeLoader";

async function Home({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const tema = (await searchParams).tema;
  const initialTopic = TOPIC_IDS.find((id) => id === tema) as TopicId | undefined;
  return <PracticeLoader name={session.name} initialTopic={initialTopic} />;
}

export default function Page(props: PageProps<"/">) {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center text-4xl">🌞</main>}>
      <Home searchParams={props.searchParams} />
    </Suspense>
  );
}
