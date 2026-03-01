"use client";

import { Suspense, useEffect } from "react";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { useGoToShortcut } from "@/hooks/keyboard/useGoToShortcut";
import { useGlobalShortcuts } from "@/hooks/keyboard/useGlobalShortcuts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { useUIStore } from "@/lib/store/ui.store";
import { TemplatesCommandBar } from "@/components/templates/TemplatesCommandBar";

// ─── Inner — needs Suspense because useConnectedAccounts suspends ──────────────
function ShortcutsCore() {
  const { data } = useConnectedAccounts();
  const accounts = data?.success ? data.data : [];
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen);

  useGoToShortcut();
  useGlobalShortcuts({ accounts, onOpenShortcuts: () => setOpen(true) });

  return null;
}

// ─── Public — manages modal state via store, mounts hooks, renders modals ─────
export function GlobalShortcutsMount() {
  const open        = useUIStore((s) => s.shortcutsModalOpen);
  const setOpen     = useUIStore((s) => s.setShortcutsModalOpen);
  const tplOpen     = useUIStore((s) => s.templatesBarOpen);
  const setTplOpen  = useUIStore((s) => s.setTemplatesBarOpen);

  // Alt+T — open / close templates command bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        const target = e.target as HTMLElement;
        // Don't hijack when typing in an input / contenteditable
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        e.preventDefault();
        setTplOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTplOpen]);

  return (
    <>
      <Suspense fallback={null}>
        <ShortcutsCore />
      </Suspense>
      <KeyboardShortcutsModal open={open} onClose={() => setOpen(false)} />
      <Suspense fallback={null}>
        <TemplatesCommandBar open={tplOpen} onClose={() => setTplOpen(false)} />
      </Suspense>
    </>
  );
}
