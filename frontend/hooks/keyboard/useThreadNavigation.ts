"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import type { ThreadActions } from "./useThreadActions";

export function useThreadNavigation(
  threadIds: string[],
  focusedActionsRef: React.MutableRefObject<ThreadActions | null>,
) {
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const setActiveThread  = useUIStore((s) => s.setActiveThread);
  const focusedThreadId  = useUIStore((s) => s.focusedThreadId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const idx = focusedThreadId ? threadIds.indexOf(focusedThreadId) : -1;

      switch (e.key.toLowerCase()) {
        case "j": {
          e.preventDefault();
          const next = threadIds[idx + 1];
          if (next) setFocusedThread(next);
          break;
        }
        case "k": {
          e.preventDefault();
          const prev = threadIds[idx - 1];
          if (prev) setFocusedThread(prev);
          break;
        }
        case "enter": {
          e.preventDefault();
          if (focusedThreadId) setActiveThread(focusedThreadId);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [threadIds, focusedThreadId, setFocusedThread, setActiveThread]);
}