"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import { useComposerStore } from "@/lib/store/composer.store";
import type { ThreadActions } from "./useThreadActions";

export function useThreadNavigation(
  threadIds: string[],
  focusedActionsRef: React.MutableRefObject<ThreadActions | null>,
) {
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const focusedThreadId = useUIStore((s) => s.focusedThreadId);
  // ── KEY FIX: read layoutMode so J/K can open thread in flow mode ────────────
  const layoutMode = useUIStore((s) => s.layoutMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      // Don't steal keypresses while a compose dialog is open — the user is
      // actively composing, so J/K/Enter/S/E/U should not fire list shortcuts.
      if (
        useComposerStore.getState().instances.some((i) => i.shell === "dialog")
      )
        return;

      const idx = focusedThreadId ? threadIds.indexOf(focusedThreadId) : -1;

      switch (e.key.toLowerCase()) {
        case "j": {
          e.preventDefault();
          const next = threadIds[idx + 1];
          if (!next) break;
          // Always move the highlight
          setFocusedThread(next);
          // In flow mode J/K actually opens the thread (like Gmail's flow)
          if (layoutMode === "flow") setActiveThread(next);
          break;
        }
        case "k": {
          e.preventDefault();
          const prev = threadIds[idx - 1];
          if (!prev) break;
          setFocusedThread(prev);
          if (layoutMode === "flow") setActiveThread(prev);
          break;
        }
        case "enter": {
          e.preventDefault();
          // Enter always opens — in all modes
          if (focusedThreadId) setActiveThread(focusedThreadId);
          break;
        }
        case "escape": {
          // Close sheet / detail without preventing other Esc handlers
          setActiveThread(null);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    threadIds,
    focusedThreadId,
    layoutMode,
    setFocusedThread,
    setActiveThread,
    focusedActionsRef,
  ]);
}
