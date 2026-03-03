"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInboxZero,
  useUpdateInboxState,
} from "@/features/mailbox/mailbox.query";
import {
  type InboxZeroEmail,
  type FullEmail,
} from "@/features/mailbox/mailbox.type";
import { useComposer } from "@/components/composer/hooks/useComposer";
import { useComposerStore, usePanelInstance } from "@/lib/store/composer.store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, Check, Clock, Paperclip, Inbox } from "lucide-react";
import { QuickReply } from "@/components/dashboard/thread-view/components/QuickReply";
import { SmartReplies } from "@/components/composer/SmartReplies";
import { PanelShell } from "@/components/composer/shells/PanelShell";
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

/** Safe cast — InboxZeroEmail and FullEmail are structurally identical */
function toFullEmail(e: InboxZeroEmail): FullEmail {
  return e as unknown as FullEmail;
}

// ── Sandboxed email renderer ───────────────────────────────────────────────────
// Isolates email HTML in a script-less iframe so third-party CSS/fonts/layouts
// can never bleed into the app shell.
function IsolatedEmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  const resize = useCallback(() => {
    const body = ref.current?.contentDocument?.body;
    if (body) setHeight(body.scrollHeight + 20);
  }, []);

  const srcDoc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; overflow-x: hidden; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px; line-height: 1.6; color: #374151;
    word-break: break-word; overflow-wrap: break-word;
  }
  * { max-width: 100% !important; }
  table { width: 100% !important; table-layout: fixed !important; }
  td, th { word-break: break-word !important; }
  img { max-width: 100% !important; height: auto !important; display: block; }
  a { color: #6366f1; }
  pre, code { white-space: pre-wrap !important; }
</style>
</head><body>${html}</body></html>`;

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      scrolling="no"
      title="email-body"
      className="w-full border-none block"
      style={{ height }}
      onLoad={resize}
    />
  );
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

function Kbd({ children }: { children: string }) {
  return (
    <span className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-semibold bg-white/20 dark:bg-black/20 border border-white/25 dark:border-black/20 shrink-0">
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
        "flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-6 py-3 rounded-xl text-[13px] sm:text-[14px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
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
  const { replyTo } = useComposer();
  const panelInstance = usePanelInstance();

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

  const handleReply = useCallback(() => {
    if (!email) return;
    replyTo(toFullEmail(email), "panel", "reply");
  }, [email, replyTo]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open || snoozeOpen) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Never fire while typing in any input or the reply editor
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      // Never fire while the inline reply composer is open
      if (panelInstance) return;
      if (e.key === "e") act("ARCHIVED");
      if (e.key === "d") act("DONE");
      if (e.key === "r") {
        e.preventDefault();
        handleReply();
      }
      if (e.key === "s") setSnoozeOpen(true);
      if (e.key === "ArrowRight" && idx < emails.length - 1)
        setIdx((i) => i + 1);
      if (e.key === "ArrowLeft" && idx > 0) setIdx((i) => i - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, snoozeOpen, act, handleReply, idx, emails.length]);

  const senderDisplay = email?.from.name ?? email?.from.email ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="w-[calc(100vw-1rem)] sm:w-[min(calc(100vw-3rem),900px)] h-[92vh] sm:h-[78vh] p-0 gap-0 overflow-hidden border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col"
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          // Two-stage Escape: first Esc closes the composer, second closes the dialog
          if (panelInstance) {
            e.preventDefault();
            useComposerStore.getState().close(panelInstance.id);
          }
          // else: let Radix handle it → dialog closes normally
        }}
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
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {idx + 1}{" "}
                  <span className="text-neutral-300 dark:text-neutral-600">
                    /
                  </span>{" "}
                  {total}
                </span>
                {/* Progress bar */}
                <div className="hidden xs:block w-28 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
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
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
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
            <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden border-t border-neutral-50 dark:border-neutral-800/60">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="px-4 sm:px-6 pt-1 sm:pt-2">
                  {email.bodyHtml ? (
                    <IsolatedEmailFrame html={email.bodyHtml} />
                  ) : (
                    <p className="py-4 text-[13px] text-neutral-500 dark:text-neutral-400 italic leading-relaxed">
                      {email.snippet || "No preview available."}
                    </p>
                  )}
                  {/* Spacer so content clears the floating reply card */}
                  {!panelInstance && <div className="hidden sm:block h-28" />}
                </div>
              </div>

              {/* Desktop floating QuickReply + SmartReplies — anchored to this relative container */}
              {!panelInstance && (
                <div className="hidden sm:block">
                  <QuickReply
                    userEmail={email.emailAddress}
                    lastEmail={toFullEmail(email)}
                    variant="float"
                    shell="panel"
                  >
                    <SmartReplies
                      threadId={email.threadId}
                      emailAddress={email.emailAddress}
                      lastEmail={toFullEmail(email)}
                      shell="panel"
                      variant="rows"
                    />
                  </QuickReply>
                </div>
              )}
            </div>

            {/* ── Composer panel — slides up from bottom ── */}
            {panelInstance && <PanelShell instance={panelInstance} />}

            {/* ── Desktop action buttons ── */}
            {!panelInstance && (
              <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-5 border-t border-neutral-100 dark:border-neutral-800">
                <div className="grid grid-cols-3 gap-3">
                  <DropdownMenu open={snoozeOpen} onOpenChange={setSnoozeOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={isPending}
                        className={cn(
                          "flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-[14px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
                          "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                          "hover:bg-neutral-50 dark:hover:bg-neutral-700",
                          "border border-neutral-200 dark:border-neutral-700",
                        )}
                      >
                        <Clock size={14} />
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
                  <ActionButton
                    onClick={() => act("ARCHIVED")}
                    disabled={isPending}
                    kbd="E"
                  >
                    <Archive size={14} /> Archive
                  </ActionButton>
                  <ActionButton
                    onClick={() => act("DONE")}
                    disabled={isPending}
                    kbd="D"
                    variant="solid"
                  >
                    <Check size={14} /> Done
                  </ActionButton>
                </div>
              </div>
            )}

            {/* ── Mobile Reply + AI chips bar ── */}
            {!panelInstance && (
              <div className="sm:hidden border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 pb-4">
                {/* AI suggestion chips */}
                <div className="overflow-x-auto scrollbar-none mb-2">
                  <SmartReplies
                    threadId={email.threadId}
                    emailAddress={email.emailAddress}
                    lastEmail={toFullEmail(email)}
                    shell="panel"
                    variant="rows"
                  />
                </div>
                {/* Reply button */}
                <button
                  onClick={handleReply}
                  disabled={!email}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-40"
                >
                  Reply
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
