"use client";

import { IconMail, IconArrowUpRight } from "@tabler/icons-react";
import { useUIStore } from "@/lib/store/ui.store";
import type { MessageSource } from "@/features/conversations/conversations.type";

interface EmailSourceCardProps {
  source: MessageSource;
}

export function EmailSourceCard({ source }: EmailSourceCardProps) {
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  const threadId = (source.metadata?.threadId as string) ?? source.emailId;
  const subject = source.metadata?.subject as string | undefined;

  // from can be a string or { name, email } object depending on how it was stored
  const fromRaw = source.metadata?.from;
  const from =
    typeof fromRaw === "string"
      ? fromRaw
      : (fromRaw as any)?.name || (fromRaw as any)?.email || undefined;

  const displayPrimary =
    subject || from || source.snippet?.slice(0, 60) || "View email";

  if (!threadId) return null;

  return (
    <button
      onClick={() => setActiveThread(threadId)}
      className="group flex items-center gap-2 w-full text-left px-2 py-[5px] rounded-md hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors duration-100 cursor-pointer"
    >
      <IconMail
        size={12}
        className="shrink-0 text-amber-500 dark:text-amber-400 opacity-40 group-hover:opacity-90 transition-opacity"
      />
      <span className="flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden">
        <span className="text-[12px] text-neutral-600 dark:text-white/60 group-hover:text-neutral-900 dark:group-hover:text-white/90 truncate transition-colors leading-snug">
          {displayPrimary}
        </span>
        {subject && from && (
          <span className="text-[11px] text-neutral-400 dark:text-white/25 truncate shrink-0 leading-snug">
            {from}
          </span>
        )}
      </span>
      <IconArrowUpRight
        size={11}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-amber-500 dark:text-amber-400 transition-opacity -translate-y-px translate-x-px"
      />
    </button>
  );
}
