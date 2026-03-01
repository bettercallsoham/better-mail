"use client";

import { Suspense } from "react";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { useGoToShortcut } from "@/hooks/keyboard/useGoToShortcut";
import { useGlobalShortcuts } from "@/hooks/keyboard/useGlobalShortcuts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { useUIStore } from "@/lib/store/ui.store";

// ─── Inner — needs Suspense because useConnectedAccounts suspends ──────────────
function ShortcutsCore() {
  const { data } = useConnectedAccounts();
  const accounts = data?.success ? data.data : [];
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen);

  useGoToShortcut();
  useGlobalShortcuts({ accounts, onOpenShortcuts: () => setOpen(true) });

  return null;
}

// ─── Public — manages modal state via store, mounts hooks, renders modal ──────
export function GlobalShortcutsMount() {
  const open = useUIStore((s) => s.shortcutsModalOpen);
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen);

  return (
    <>
      <Suspense fallback={null}>
        <ShortcutsCore />
      </Suspense>
      <KeyboardShortcutsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
