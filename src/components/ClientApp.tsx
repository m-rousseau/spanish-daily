"use client";
import type { TopicId } from "@/lib/topics";
import AppShell from "./AppShell";
import Practice from "./Practice";
import History from "./History";
import Exam from "./Exam";

export type Page = "practice" | "history" | "exam";

/** The whole browser-side app for one page, loaded in a single chunk. */
export default function ClientApp({ page, name, initialTopic }: { page: Page; name: string; initialTopic?: TopicId }) {
  return (
    <AppShell name={name}>
      {page === "practice" ? <Practice name={name} initialTopic={initialTopic} /> : page === "history" ? <History /> : <Exam name={name} />}
    </AppShell>
  );
}
