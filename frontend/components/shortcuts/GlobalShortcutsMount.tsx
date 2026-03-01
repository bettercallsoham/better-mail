"use client";

import { useState, Suspense } from "react";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { useGoToShortcut } from "@/hooks/keyboard/useGoToShortcut";
import { useGlobalShortcuts } from "@/hooks/keyboard/useGlobalShortcuts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

// ─── Inner — needs Suspense because useConnectedAccounts suspends ──────────────
function ShortcutsCore({ onOpen }: { onOpen: () => void }) {
  const { data } = useConnectedAccounts();
  const accounts = data?.success ? data.data : [];

  useGoToShortcut();
  useGlobalShortcuts({ accounts, onOpenShortcuts: onOpen });

  return null;
}

// ─── Public — manages modal state, mounts hooks, renders modal ────────────────
export function GlobalShortcutsMount() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Suspense fallback={null}>
        <ShortcutsCore onOpen={() => setOpen(true)} />
      </Suspense>
      <KeyboardShortcutsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
