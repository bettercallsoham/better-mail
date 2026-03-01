"use client";

import { useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/ui.store";

// Maps second key → folder name (Gmail-style G-sequences)
const GOTO_MAP: Record<string, string> = {
  i: "inbox",
  s: "starred",
  t: "sent",
  d: "drafts",
  a: "archive",
};

/**
 * Enables Gmail-style go-to shortcuts: press G, then within 800ms press
 * I/S/T/D/A to jump to that folder. Displays nothing — pure keyboard hook.
 */
export function useGoToShortcut() {
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const waiting   = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      waiting.current = false;
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT"    ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (waiting.current) {
        const folder = GOTO_MAP[e.key.toLowerCase()];
        if (folder) {
          e.preventDefault();
          setActiveFolder(folder);
        }
        reset();
        return;
      }

      if (e.key.toLowerCase() === "g") {
        // Don't consume the event — just start waiting for the second key.
        // If another key fires within 800 ms it will be treated as the target.
        waiting.current = true;
        timerRef.current = setTimeout(reset, 800);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      reset();
    };
  }, [setActiveFolder]);
}
