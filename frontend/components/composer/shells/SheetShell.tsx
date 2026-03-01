"use client";

import { useCallback } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useComposerStore, type ComposerInstance } from "@/lib/store/composer.store";
import { ComposerHeader } from "../ComposerHeader";
import { ComposerEditor } from "../ComposerEditor";
import { ComposerFooter } from "../ComposerFooter";

const MODE_LABEL: Record<string, string> = {
  reply: "Reply", reply_all: "Reply All", forward: "Forward", new: "New Message",
};

export function SheetShell({ instance }: { instance: ComposerInstance }) {
  const store = useComposerStore();
  const close = useCallback(() => store.close(instance.id), [store, instance.id]);

  return (
    <div className={cn(
      "flex flex-col border-t border-black/[0.07] dark:border-white/[0.07]",
      "bg-white dark:bg-[#18181b]",
      "animate-in slide-in-from-bottom-2 duration-150",
    )}>
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1 shrink-0">
        <span className="text-[11.5px] font-medium text-gray-400 dark:text-white/35">{MODE_LABEL[instance.mode]}</span>
        <button onClick={close} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/25 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors">
          <IconChevronDown size={13} />
        </button>
      </div>

      <ComposerHeader instance={instance} />

      <div className="px-4 py-3 max-h-[260px] overflow-y-auto">
        <ComposerEditor instance={instance} minHeight={100} placeholder={instance.mode === "forward" ? "Add a message…" : "Write your reply…"} />
      </div>

      <ComposerFooter instance={instance} onClose={close} />
    </div>
  );
}