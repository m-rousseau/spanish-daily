"use client";
import dynamic from "next/dynamic";
import type { TopicId } from "@/lib/topics";

const Splash = () => <main className="flex flex-1 items-center justify-center text-4xl">🌞</main>;

// These screens read localStorage and browser speech APIs, so render them only in the browser.
const Practice = dynamic(() => import("./Practice"), { ssr: false, loading: Splash });
const History = dynamic(() => import("./History"), { ssr: false, loading: Splash });

export function PracticeLoader({ name, initialTopic }: { name: string; initialTopic?: TopicId }) {
  return <Practice name={name} initialTopic={initialTopic} />;
}

export function HistoryLoader({ name }: { name: string }) {
  return <History name={name} />;
}
