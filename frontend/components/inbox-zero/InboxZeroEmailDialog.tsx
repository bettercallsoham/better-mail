"use client";

import { useCallback, useEffect } from "react";
import { InboxZeroEmail } from "@/features/mailbox/mailbox.type";
import { useUpdateInboxState } from "@/features/mailbox/mailbox.query";
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

function snoozeOptions() {
  const now = new Date();
  return [
    {
      label: "In 2 hours",
      value: addHours(now, 2).toISOString(),
    },
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

export function InboxZeroEmailDialog({
  email,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: Props) {
  const { mutate: updateState, isPending } = useUpdateInboxState();

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

  // ← → keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!email) return;
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
      if (e.key === "e") act("ARCHIVED");
      if (e.key === "d") act("DONE");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [email, hasPrev, hasNext, onPrev, onNext, act]);

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
        <div className="px-6 py-4 max-h-[52vh] overflow-y-auto">
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
              ←→
            </kbd>
            {" navigate"}
          </span>

          {/* Snooze dropdown */}
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
