"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import type { useThreadActions } from "@/hooks/keyboard/useThreadActions";

type ThreadActions = ReturnType<typeof useThreadActions>;

export function useThreadNavigation(
  threadIds: string[],
  focusedActionsRef: React.RefObject<ThreadActions | null>,
): void {
  const setActiveThread  = useUIStore((s) => s.setActiveThread);
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const layoutMode       = useUIStore((s) => s.layoutMode);

  useEffect(() => {
    if (!threadIds.length) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT"    ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const focused    = useUIStore.getState().focusedThreadId;
      const active     = useUIStore.getState().activeThreadId;
      const mode       = useUIStore.getState().layoutMode;
      const currentId  = focused ?? active ?? threadIds[0];
      const currentIdx = currentId ? threadIds.indexOf(currentId) : -1;

      switch (e.key) {
        // ── Navigation ───────────────────────────────────────────────────────
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const nextIdx = Math.min(currentIdx === -1 ? 0 : currentIdx + 1, threadIds.length - 1);
          const next = threadIds[nextIdx];
          if (!next) return;
          setFocusedThread(next);
          if (mode === "flow") setActiveThread(next);
          return;
        }

        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const prevIdx = Math.max(currentIdx === -1 ? 0 : currentIdx - 1, 0);
          const prev = threadIds[prevIdx];
          if (!prev) return;
          setFocusedThread(prev);
          if (mode === "flow") setActiveThread(prev);
          return;
        }

        case "Enter": {
          const toOpen = useUIStore.getState().focusedThreadId
                      ?? useUIStore.getState().activeThreadId;
          if (!toOpen) return;
          e.preventDefault();
          setActiveThread(toOpen);
          return;
        }

        // ── Actions (reuse same mutation path as hover buttons) ──────────────
        case "s": {
          e.preventDefault();
          focusedActionsRef.current?.star();
          return;
        }

        case "u": {
          e.preventDefault();
          focusedActionsRef.current?.markRead();
          return;
        }

        case "e": {
          e.preventDefault();
          focusedActionsRef.current?.archive();
          // Auto-advance to next thread after archiving
          const targetId = focused ?? active;
          if (targetId === active) {
            const nextIdx = Math.min(currentIdx + 1, threadIds.length - 1);
            const fallback = threadIds[nextIdx] ?? threadIds[currentIdx - 1] ?? null;
            setActiveThread(fallback);
            if (fallback) setFocusedThread(fallback);
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [threadIds, setActiveThread, setFocusedThread, layoutMode, focusedActionsRef]);
}