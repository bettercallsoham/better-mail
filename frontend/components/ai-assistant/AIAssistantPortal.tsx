"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { useAIStore } from "@/lib/store/ui.store";
import { AIAssistantButton } from "./AIAssistantButton";
import { AIAssistantPanel } from "./AIAssistantPanel";

export function AIAssistantPortal() {
  const { aiAssistantOpen, aiMode, setAIAssistantOpen } = useAIStore();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Keyboard shortcut: Cmd/Ctrl + . to toggle the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        // Don't steal focus from active inputs
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        e.preventDefault();
        setAIAssistantOpen(!aiAssistantOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [aiAssistantOpen, setAIAssistantOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      <AIAssistantButton />

      <AnimatePresence>
        {aiAssistantOpen && !aiMode && <AIAssistantPanel />}
      </AnimatePresence>
    </>,
    document.body,
  );
}
