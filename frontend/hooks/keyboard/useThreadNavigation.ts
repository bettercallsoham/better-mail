"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/ui.store";


export function useThreadNavigation(threadIds: string[]): void {
  const setActiveThread  = useUIStore((s) => s.setActiveThread);
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const layoutMode       = useUIStore((s) => s.layoutMode);

  useEffect(() => {
    if (!threadIds.length) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Never hijack events while user is typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      // Read latest state inline to avoid stale closure
      const focused = useUIStore.getState().focusedThreadId;
      const active  = useUIStore.getState().activeThreadId;
      const mode    = useUIStore.getState().layoutMode;

      const currentId  = focused ?? active ?? threadIds[0];
      const currentIdx = currentId ? threadIds.indexOf(currentId) : -1;

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const nextIdx = Math.min(
            currentIdx === -1 ? 0 : currentIdx + 1,
            threadIds.length - 1,
          );
          const next = threadIds[nextIdx];
          if (!next) break;
          setFocusedThread(next);
          // In flow mode j/k also selects (opens detail immediately)
          if (mode === "flow") setActiveThread(next);
          break;
        }

        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const prevIdx = Math.max(
            currentIdx === -1 ? 0 : currentIdx - 1,
            0,
          );
          const prev = threadIds[prevIdx];
          if (!prev) break;
          setFocusedThread(prev);
          if (mode === "flow") setActiveThread(prev);
          break;
        }

        case "Enter": {
          const toOpen = useUIStore.getState().focusedThreadId
                      ?? useUIStore.getState().activeThreadId;
          if (!toOpen) break;
          e.preventDefault();
          setActiveThread(toOpen);
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);

  }, [threadIds, setActiveThread, setFocusedThread, layoutMode]);
}