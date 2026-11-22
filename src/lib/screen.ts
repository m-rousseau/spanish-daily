"use client";
// What's on her screen right now, so the tutor chat can see the current question.
import { useSyncExternalStore } from "react";

export type Screen = { label: string; text: string } | null;
let screen: Screen = null;
const listeners = new Set<() => void>();

export function setScreen(next: Screen) {
  screen = next;
  listeners.forEach((l) => l());
}

export function useScreen(): Screen {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => screen,
    () => null,
  );
}
