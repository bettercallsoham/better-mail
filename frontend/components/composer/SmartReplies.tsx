"use client";

import { useState, useCallback } from "react";
import { IconSparkles, IconChevronDown } from "@tabler/icons-react";
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

// ── Rows variant sub-component (needs its own state) ──────────────────────────
function RowsVariant({
  suggestions,
  isPending,
  onSelect,
}: {
  suggestions: ReplySuggestion[];
  isPending: boolean;
  onSelect: (s: ReplySuggestion) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        <IconSparkles size={11} className="text-violet-500 dark:text-violet-400 shrink-0" />
        <span className="text-[10.5px] font-medium text-gray-400 dark:text-white/28 select-none shrink-0">
          Reply as
        </span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isPending
            ? [1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-14 rounded-lg bg-black/5 dark:bg-white/6 animate-pulse shrink-0" />
              ))
            : suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(s)}
                  className={cn(
                    "h-6 px-2.5 rounded-lg text-[11.5px] font-medium capitalize transition-colors active:scale-95 shrink-0",
                    "bg-black/[0.04] dark:bg-white/[0.06]",
                    "text-gray-600 dark:text-white/50",
                    "hover:bg-violet-50 dark:hover:bg-violet-950/25",
                    "hover:text-violet-600 dark:hover:text-violet-400",
                  )}
                >
                  {s.tone}
                </button>
              ))}
        </div>
        {!isPending && suggestions.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/45 transition-colors"
          >
            <IconChevronDown
              size={12}
              className={cn("transition-transform duration-150", expanded && "rotate-180")}
            />
          </button>
        )}
      </div>

      {/* Expanded text previews */}
      {expanded && !isPending && (
        <div className="px-3 pb-2.5 space-y-0.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s)}
              className="w-full text-left flex items-baseline gap-2 px-2 py-1 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors group"
            >
              <span className="text-[10px] font-semibold capitalize text-gray-400 dark:text-white/28 shrink-0 w-[60px] group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                {s.tone}
              </span>
              <span className="text-[11.5px] text-gray-500 dark:text-white/40 truncate">
                {snippet(s.body)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // ── Rows variant — "Reply as" tone chips + collapsible text preview ────────
  if (variant === "rows") {
    return <RowsVariant suggestions={suggestions} isPending={isPending} onSelect={handleSelect} />;
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
