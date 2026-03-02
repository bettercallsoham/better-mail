"use client";

import { useCallback } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useReplySuggestionsQuery } from "@/features/ai/ai.query";
import { useComposerStore } from "@/lib/store/composer.store";
import { useComposer } from "@/components/composer/hooks/useComposer";
import { stripHtml } from "@/lib/utils/stripHtml";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import type { ReplySuggestion } from "@/features/ai/ai.type";

interface SmartRepliesProps {
  threadId: string;
  emailAddress: string;
  lastEmail: FullEmail;
  shell?: "panel" | "sheet";
  /**
   * rows   = flat tappable rows inside a QuickReply glass card (ThreadDetail)
   * inline = compact tone chip strip docked in ThreadSheet
   */
  variant?: "rows" | "inline";
  className?: string;
}

// Max 15 words so the snippet fits on one line without truncation ellipsis
const snippet = (body: string) => {
  const text = stripHtml(body).trim();
  const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? text;
  const words = sentence.split(/\s+/);
  return words.length <= 15 ? sentence : words.slice(0, 15).join(" ") + "…";
};

export function SmartReplies({
  threadId,
  emailAddress,
  lastEmail,
  shell = "panel",
  variant = "inline",
  className,
}: SmartRepliesProps) {
  const { data, isPending, isError } = useReplySuggestionsQuery(
    threadId,
    emailAddress,
  );
  const { replyTo } = useComposer();

  const handleSelect = useCallback(
    (s: ReplySuggestion) => {
      replyTo(lastEmail, shell, "reply");
      setTimeout(() => {
        const inst = useComposerStore
          .getState()
          .instances.find(
            (i) => i.threadId === lastEmail.threadId && i.shell === shell,
          );
        if (inst) {
          useComposerStore.getState().setPendingTemplate(inst.id, {
            id: -1,
            userId: "",
            name: "",
            subject: s.subject,
            body: s.body,
            variables: [],
            category: null,
            tags: [],
            usageCount: 0,
            version: 1,
            createdAt: "",
            updatedAt: "",
          });
        }
      }, 50);
    },
    [lastEmail, shell, replyTo],
  );

  if (isError) return null;
  if (!isPending && !data?.suggestions?.length) return null;

  const suggestions = data?.suggestions.slice(0, 3) ?? [];

  // ── Rows variant — horizontal chip strip inside QuickReply glass card (ThreadDetail) ──
  if (variant === "rows") {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
        <div className="flex items-center gap-1 shrink-0">
          <IconSparkles
            size={11}
            className="text-violet-500 dark:text-violet-400"
          />
          <span className="text-[10.5px] font-medium text-gray-400 dark:text-white/28 select-none">
            Suggest
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {isPending
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-28 rounded-full bg-black/5 dark:bg-white/6 animate-pulse shrink-0"
                />
              ))
            : suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    "flex items-center h-7 px-3 rounded-full shrink-0",
                    "text-[12px] font-medium transition-all duration-100 active:scale-95",
                    "bg-black/4 dark:bg-white/6",
                    "text-gray-600 dark:text-white/55",
                    "hover:bg-violet-50 dark:hover:bg-violet-950/30",
                    "hover:text-violet-600 dark:hover:text-violet-400",
                    "border border-transparent hover:border-violet-200/60 dark:hover:border-violet-700/30",
                    "max-w-40 truncate",
                  )}
                >
                  {snippet(s.body)}
                </button>
              ))}
        </div>
      </div>
    );
  }

  // ── Inline variant — compact tone chip strip (ThreadSheet) ────────────────
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <div className="flex items-center gap-1 shrink-0">
        <IconSparkles
          size={11}
          className="text-violet-500 dark:text-violet-400"
        />
        <span className="text-[10.5px] font-medium text-gray-400 dark:text-white/28 select-none">
          Reply as
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {isPending
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 w-14 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] animate-pulse"
              />
            ))
          : suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className={cn(
                  "h-6 px-2.5 rounded-lg text-[11.5px] font-medium capitalize transition-colors",
                  "bg-black/[0.04] dark:bg-white/[0.06]",
                  "text-gray-600 dark:text-white/50",
                  "hover:bg-violet-50 dark:hover:bg-violet-950/25",
                  "hover:text-violet-600 dark:hover:text-violet-400",
                  "active:scale-95",
                )}
              >
                {s.tone}
              </button>
            ))}
      </div>
    </div>
  );
}
