"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import type { ConnectedAccount } from "@/features/mailbox/mailbox.type";

interface Options {
  /** Connected accounts list — used for ⌘1/2/3 account switching */
  accounts: ConnectedAccount[];
  /** Called when the user presses ? to open the shortcuts help modal */
  onOpenShortcuts: () => void;
}

/**
 * Global app-level keyboard shortcuts:
 *  `          — toggle sidebar
 *  ⌘/Ctrl 0   — switch to "all accounts"
 *  ⌘/Ctrl 1-3 — switch to nth connected account
 *  ?          — open keyboard shortcuts modal
 */
export function useGlobalShortcuts({ accounts, onOpenShortcuts }: Options) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSelectedEmail = useUIStore((s) => s.setSelectedEmailAddress);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // ── Backtick: toggle sidebar (never while typing) ─────────────────────
      if (e.key === "`" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ── ? — shortcuts modal (never while typing) ──────────────────────────
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !isTyping) {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }

      // ── ⌘/Ctrl + 0-3 — account switching ────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === "0") {
          e.preventDefault();
          setSelectedEmail(null);
          return;
        }
        const idx = parseInt(e.key, 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < accounts.length) {
          e.preventDefault();
          setSelectedEmail(accounts[idx].email);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, setSelectedEmail, accounts, onOpenShortcuts]);
}
