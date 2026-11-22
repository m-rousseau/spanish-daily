"use client";
import dynamic from "next/dynamic";
import type { TopicId } from "@/lib/topics";

const Splash = () => <main className="flex flex-1 items-center justify-center text-4xl">🌞</main>;

// The app reads localStorage and browser speech APIs, so it renders only in the browser.
const ClientApp = dynamic(() => import("./ClientApp"), { ssr: false, loading: Splash });

export function PracticeLoader({ name, initialTopic }: { name: string; initialTopic?: TopicId }) {
  return <ClientApp page="practice" name={name} initialTopic={initialTopic} />;
}

export function HistoryLoader({ name }: { name: string }) {
  return <ClientApp page="history" name={name} />;
}

export function ExamLoader({ name }: { name: string }) {
  return <ClientApp page="exam" name={name} />;
}

export function GalleryLoader({ name }: { name: string }) {
  return <ClientApp page="photos" name={name} />;
}
