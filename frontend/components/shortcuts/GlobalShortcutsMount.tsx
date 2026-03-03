"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { useGoToShortcut } from "@/hooks/keyboard/useGoToShortcut";
import { useGlobalShortcuts } from "@/hooks/keyboard/useGlobalShortcuts";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { useUIStore } from "@/lib/store/ui.store";
import { TemplatesCommandBar } from "@/components/templates/TemplatesCommandBar";

function ShortcutsCore() {
  const { data } = useConnectedAccounts();
  const accounts = data?.success ? data.data : [];
  const setOpen = useUIStore((s) => s.setShortcutsModalOpen);

  useGoToShortcut();
  useGlobalShortcuts({ accounts, onOpenShortcuts: () => setOpen(true) });

  return null;
}

export function GlobalShortcutsMount() {
  const router = useRouter();
  const open        = useUIStore((s) => s.shortcutsModalOpen);
  const setOpen     = useUIStore((s) => s.setShortcutsModalOpen);
  const tplOpen     = useUIStore((s) => s.templatesBarOpen);
  const setTplOpen  = useUIStore((s) => s.setTemplatesBarOpen);
  const setInboxZeroOpen = useUIStore((s) => s.setInboxZeroOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setTplOpen(true);
      } else if (e.key === "0") {
        e.preventDefault();
        setInboxZeroOpen(true);
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        router.push("/app/insights");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTplOpen, setInboxZeroOpen, router]);

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