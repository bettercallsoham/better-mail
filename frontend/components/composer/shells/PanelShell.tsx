"use client";

import { useEffect, useCallback } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import { ComposerHeader } from "../ComposerHeader";
import { ComposerEditor } from "../ComposerEditor";
import { ComposerFooter } from "../ComposerFooter";

const MODE_LABEL: Record<string, string> = {
  reply: "Reply",
  reply_all: "Reply All",
  forward: "Forward",
  new: "New Message",
};

export function PanelShell({ instance }: { instance: ComposerInstance }) {
  const store = useComposerStore();
  const close = useCallback(
    () => store.close(instance.id),
    [store, instance.id],
  );

  // Esc to close (only if not dirty)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !instance.isDirty) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, instance.isDirty]);

  return (
    <div
      className={cn(
        "shrink-0 flex flex-col",
        "border-t border-black/[0.07] dark:border-white/[0.07]",
        "bg-white dark:bg-[#27241f]",
        "animate-in slide-in-from-bottom-2 duration-200",
      )}
      data-instance={instance.id}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
        <span className="text-[12px] font-medium text-gray-500 dark:text-white/40">
          {MODE_LABEL[instance.mode]}
        </span>
        <button
          onClick={close}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/25 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/55 transition-colors"
        >
          <IconChevronDown size={14} />
        </button>
      </div>

      <ComposerHeader instance={instance} />

      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[140px] max-h-[360px]">
        <ComposerEditor
          instance={instance}
          placeholder={
            instance.mode === "forward" ? "Add a message…" : "Write your reply…"
          }
        />
      </div>

      <ComposerFooter instance={instance} onClose={close} />
    </div>
  );
}
