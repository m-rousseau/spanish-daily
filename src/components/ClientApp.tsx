"use client";
import type { TopicId } from "@/lib/topics";
import AppShell from "./AppShell";
import Practice from "./Practice";
import History from "./History";
import Exam from "./Exam";
import Gallery from "./Gallery";

export type Page = "practice" | "history" | "exam" | "photos";

/** The whole browser-side app for one page, loaded in a single chunk. */
export default function ClientApp({ page, name, initialTopic }: { page: Page; name: string; initialTopic?: TopicId }) {
  return (
    <AppShell name={name}>
      {page === "practice" ? <Practice name={name} initialTopic={initialTopic} /> : page === "history" ? <History /> : page === "photos" ? <Gallery name={name} /> : <Exam name={name} />}
    </AppShell>
  );
}
