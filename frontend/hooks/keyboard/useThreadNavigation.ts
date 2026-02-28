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
  const layoutMode       = useUIStore((s) => s.layoutMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT"    ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const idx = focusedThreadId ? threadIds.indexOf(focusedThreadId) : -1;

      // Helper: open a thread and mark it read
      const openAndMarkRead = (id: string) => {
        setActiveThread(id);
        focusedActionsRef.current?.markRead();
      };

      switch (e.key.toLowerCase()) {
        case "j": {
          e.preventDefault();
          const next = threadIds[idx + 1];
          if (!next) break;
          setFocusedThread(next);
          // In flow mode J/K navigates AND opens the thread
          if (layoutMode === "flow") openAndMarkRead(next);
          break;
        }
        case "k": {
          e.preventDefault();
          const prev = threadIds[idx - 1];
          if (!prev) break;
          setFocusedThread(prev);
          if (layoutMode === "flow") openAndMarkRead(prev);
          break;
        }
        case "enter": {
          e.preventDefault();
          // Enter always opens — in all modes
          if (focusedThreadId) openAndMarkRead(focusedThreadId);
          break;
        }
        case "escape": {
          // Close thread detail without blocking other Esc handlers
          setActiveThread(null);
          break;
        }
        // ── Per-thread action shortcuts ──────────────────────────────────────
        case "s": {
          e.preventDefault();
          focusedActionsRef.current?.star();
          break;
        }
        case "e": {
          e.preventDefault();
          focusedActionsRef.current?.archiveToggle();
          break;
        }
        case "u": {
          e.preventDefault();
          focusedActionsRef.current?.markRead();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [threadIds, focusedThreadId, layoutMode, setFocusedThread, setActiveThread, focusedActionsRef]);
}