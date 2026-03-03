"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useInboxZero,
  useUpdateInboxState,
} from "@/features/mailbox/mailbox.query";
import { InboxZeroEmail } from "@/features/mailbox/mailbox.type";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, Check, Clock, Paperclip, Inbox } from "lucide-react";
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
  open: boolean;
  onClose: () => void;
}

const PROVIDER_MAP = { gmail: "GOOGLE", outlook: "OUTLOOK" } as const;

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

function Kbd({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-semibold bg-white/20 dark:bg-black/20 border border-white/25 dark:border-black/20 shrink-0">
      {children}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  kbd,
  variant = "outline",
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  kbd: string;
  variant?: "outline" | "solid";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
        variant === "solid"
          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 border border-transparent"
          : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700",
        className,
      )}
    >
      {children}
      <Kbd>{kbd}</Kbd>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InboxZeroQueueDialog({ open, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage } = useInboxZero();
  const { mutate: updateState, isPending } = useUpdateInboxState();

  const emails: InboxZeroEmail[] = data?.pages.flatMap((p) => p.emails) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const email = emails[idx] ?? null;

  // Pre-fetch when approaching end
  useEffect(() => {
    if (hasNextPage && idx >= emails.length - 3) {
      fetchNextPage();
    }
  }, [idx, emails.length, hasNextPage, fetchNextPage]);

  const advance = useCallback(() => {
    if (idx < emails.length - 1) {
      setIdx((i) => i + 1);
    } else {
      onClose();
    }
  }, [idx, emails.length, onClose]);

  const act = useCallback(
    (action: "ARCHIVED" | "DONE" | "SNOOZED", snoozeUntil?: string) => {
      if (!email || isPending) return;
      updateState(
        {
          email: email.emailAddress,
          provider: PROVIDER_MAP[email.provider],
          messageIds: [email.providerMessageId],
          action,
          ...(snoozeUntil && { snoozeUntil }),
        },
        { onSuccess: advance },
      );
    },
    [email, isPending, updateState, advance],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!open || snoozeOpen) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "e") act("ARCHIVED");
      if (e.key === "d") act("DONE");
      if (e.key === "s") setSnoozeOpen(true);
      if (e.key === "ArrowRight" && idx < emails.length - 1)
        setIdx((i) => i + 1);
      if (e.key === "ArrowLeft" && idx > 0) setIdx((i) => i - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, snoozeOpen, act, idx, emails.length]);

  const senderDisplay = email?.from.name ?? email?.from.email ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="min-w-5xl w-full h-[75vh] p-0 gap-0 overflow-hidden border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col"
        showCloseButton={false}
      >
        {/* ── Done state ── */}
        {emails.length === 0 || !email ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 px-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Inbox size={28} className="text-emerald-500" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                Inbox Zero 🎉
              </p>
              <p className="text-[13px] text-neutral-400 dark:text-neutral-500 mt-1">
                You&apos;re all caught up. Nothing left to action.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-xl text-[13px] font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* ── Top bar: progress + close ── */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {idx + 1}{" "}
                  <span className="text-neutral-300 dark:text-neutral-600">
                    /
                  </span>{" "}
                  {total}
                </span>
                {/* Progress bar */}
                <div className="w-28 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-300"
                    style={{
                      width: `${Math.round(((idx + 1) / Math.max(total, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {idx > 0 && (
                  <button
                    onClick={() => setIdx((i) => i - 1)}
                    className="px-2.5 py-1 text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    ← Prev
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="text-[13px]">✕</span>
                </button>
              </div>
            </div>

            {/* ── Email header ── */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50 leading-snug mb-1">
                    {email.subject || "(no subject)"}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-neutral-600 dark:text-neutral-300">
                      {senderDisplay}
                    </span>
                    {email.from.name && (
                      <span className="text-[12px] text-neutral-400 dark:text-neutral-500">
                        {email.from.email}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-300 dark:text-neutral-600">
                      ·
                    </span>
                    <span className="text-[12px] text-neutral-400 dark:text-neutral-500">
                      {format(new Date(email.receivedAt), "MMM d · h:mm a")}
                    </span>
                    {email.hasAttachments && (
                      <Paperclip
                        size={11}
                        className="text-neutral-400 dark:text-neutral-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-6 pb-2 flex-1 overflow-y-auto border-t border-neutral-50 dark:border-neutral-800/60">
              {email.bodyHtml ? (
                <div
                  className="py-4 prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              ) : (
                <p className="py-4 text-[13px] text-neutral-500 dark:text-neutral-400 italic leading-relaxed">
                  {email.snippet || "No preview available."}
                </p>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div className="px-6 pt-4 pb-5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="grid grid-cols-3 gap-3">
                {/* Snooze */}
                <DropdownMenu open={snoozeOpen} onOpenChange={setSnoozeOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isPending}
                      className={cn(
                        "flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
                        "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                        "hover:bg-neutral-50 dark:hover:bg-neutral-700",
                        "border border-neutral-200 dark:border-neutral-700",
                      )}
                    >
                      <Clock size={15} />
                      Snooze
                      <Kbd>S</Kbd>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
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

                {/* Archive */}
                <ActionButton
                  onClick={() => act("ARCHIVED")}
                  disabled={isPending}
                  kbd="E"
                >
                  <Archive size={15} />
                  Archive
                </ActionButton>

                {/* Done */}
                <ActionButton
                  onClick={() => act("DONE")}
                  disabled={isPending}
                  kbd="D"
                  variant="solid"
                >
                  <Check size={15} />
                  Done
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}