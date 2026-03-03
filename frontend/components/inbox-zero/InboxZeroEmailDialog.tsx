"use client";

import { useCallback, useEffect } from "react";
import { type InboxZeroEmail, type FullEmail } from "@/features/mailbox/mailbox.type";
import { useUpdateInboxState } from "@/features/mailbox/mailbox.query";
import { useReplySuggestionsQuery } from "@/features/ai/ai.query";
import { useComposer } from "@/components/composer/hooks/useComposer";
import { useComposerStore } from "@/lib/store/composer.store";
import type { ReplySuggestion } from "@/features/ai/ai.type";
import { IconSparkles } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Archive,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Reply,
} from "lucide-react";
import {
  format,
  addHours,
  addDays,
  nextMonday,
  setHours,
  setMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  email: InboxZeroEmail | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const PROVIDER_MAP = {
  gmail: "GOOGLE",
  outlook: "OUTLOOK",
} as const;

/** Safe cast — InboxZeroEmail and FullEmail are structurally identical */
function toFullEmail(e: InboxZeroEmail): FullEmail {
  return e as unknown as FullEmail;
}

function snoozeOptions() {
  const now = new Date();
  return [
    { label: "In 2 hours", value: addHours(now, 2).toISOString() },
    {
      label: "Tomorrow 9 AM",
      value: setMinutes(setHours(addDays(now, 1), 9), 0).toISOString(),
    },
    {
      label: "Next Monday",
      value: setMinutes(setHours(nextMonday(now), 9), 0).toISOString(),
    },
  ];
}

// ─── Reply bar ────────────────────────────────────────────────────────────────

function ReplyBar({
  email,
  onReply,
}: {
  email: InboxZeroEmail;
  onReply: (suggestion?: ReplySuggestion) => void;
}) {
  const { data, isPending } = useReplySuggestionsQuery(
    email.threadId,
    email.emailAddress,
  );
  const suggestions = data?.suggestions?.slice(0, 3) ?? [];

  return (
    <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <IconSparkles
          size={11}
          className="text-violet-500 dark:text-violet-400 shrink-0"
        />
        <span className="text-[10.5px] font-medium text-neutral-400 dark:text-neutral-500 select-none">
          Reply as
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
        {isPending ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-6 w-16 rounded-lg bg-black/[0.05] dark:bg-white/[0.06] animate-pulse shrink-0"
            />
          ))
        ) : suggestions.length > 0 ? (
          suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onReply(s)}
              className={cn(
                "h-6 px-2.5 rounded-lg text-[11.5px] font-medium capitalize transition-colors active:scale-95 shrink-0",
                "bg-black/[0.04] dark:bg-white/[0.06] text-neutral-600 dark:text-neutral-400",
                "hover:bg-violet-50 dark:hover:bg-violet-950/25 hover:text-violet-600 dark:hover:text-violet-400",
              )}
            >
              {s.tone}
            </button>
          ))
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onReply()}
        className="gap-1.5 text-[12px] h-7 px-2.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 shrink-0"
      >
        <Reply size={12} />
        Reply
        <kbd className="ml-0.5 text-[9px] px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-400 dark:text-neutral-500">
          R
        </kbd>
      </Button>
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function InboxZeroEmailDialog({
  email,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: Props) {
  const { mutate: updateState, isPending } = useUpdateInboxState();
  const { replyTo } = useComposer();

  const act = useCallback(
    (action: "ARCHIVED" | "DONE" | "SNOOZED", snoozeUntil?: string) => {
      if (!email) return;
      updateState(
        {
          email: email.emailAddress,
          provider: PROVIDER_MAP[email.provider],
          messageIds: [email.providerMessageId],
          action,
          ...(snoozeUntil && { snoozeUntil }),
        },
        { onSuccess: onClose },
      );
    },
    [email, updateState, onClose],
  );

  const handleReply = useCallback(
    (suggestion?: ReplySuggestion) => {
      if (!email) return;
      replyTo(toFullEmail(email), "window", "reply");
      if (suggestion) {
        setTimeout(() => {
          const inst = useComposerStore
            .getState()
            .instances.find(
              (i) => i.threadId === email.threadId && i.shell === "window",
            );
          if (inst) {
            useComposerStore.getState().setPendingTemplate(inst.id, {
              id: -1,
              userId: "",
              name: "",
              subject: suggestion.subject,
              body: suggestion.body,
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
      }
      onClose();
    },
    [email, replyTo, onClose],
  );

  // ← → keyboard navigation + actions
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!email) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
      if (e.key === "e") act("ARCHIVED");
      if (e.key === "d") act("DONE");
      if (e.key === "r") handleReply();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [email, hasPrev, hasNext, onPrev, onNext, act, handleReply]);

  if (!email) return null;

  const senderDisplay = email.from.name
    ? `${email.from.name} <${email.from.email}>`
    : email.from.email;

  return (
    <Dialog open={!!email} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "max-w-2xl w-full p-0 gap-0 overflow-hidden",
          "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
        )}
        showCloseButton={false}
      >
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[15px] font-semibold leading-snug mb-1 text-neutral-900 dark:text-neutral-50">
                {email.subject}
              </DialogTitle>
              <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate">
                {senderDisplay}
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {format(new Date(email.receivedAt), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {email.hasAttachments && (
                <span className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 mr-1">
                  <Paperclip size={11} />
                </span>
              )}
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 ml-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="text-[13px] font-medium">✕</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="px-6 py-4 max-h-[48vh] overflow-y-auto">
          {email.bodyHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <p className="text-[13px] text-neutral-400 dark:text-neutral-500 italic">
              {email.snippet || "No preview available."}
            </p>
          )}
        </div>

        {/* ── Reply bar ── */}
        <ReplyBar email={email} onReply={handleReply} />

        {/* ── Actions ── */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mr-auto hidden sm:block">
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800">
              e
            </kbd>
            {" archive · "}
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800">
              d
            </kbd>
            {" done · "}
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800">
              r
            </kbd>
            {" reply · "}
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-100 dark:bg-neutral-800">
              ←→
            </kbd>
            {" navigate"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="gap-1.5 text-[12px] h-8 border-neutral-200 dark:border-neutral-700"
              >
                <Clock size={13} />
                Snooze
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {snoozeOptions().map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  onSelect={() => act("SNOOZED", opt.value)}
                  className="text-[13px]"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => act("ARCHIVED")}
            disabled={isPending}
            className="gap-1.5 text-[12px] h-8 border-neutral-200 dark:border-neutral-700"
          >
            <Archive size={13} />
            Archive
          </Button>

          <Button
            size="sm"
            onClick={() => act("DONE")}
            disabled={isPending}
            className="gap-1.5 text-[12px] h-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
          >
            <Check size={13} />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}