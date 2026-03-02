"use client";

import {
  Suspense,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { format } from "date-fns";
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconStar,
  IconStarFilled,
  IconArchive,
  IconArchiveOff,
  IconTrash,
  IconNotes,
  IconMailOpened,
  IconMail,
  IconDots,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail,
  useEmailAction,
} from "@/features/mailbox/mailbox.query";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { cn } from "@/lib/utils";
import { usePanelInstance } from "@/lib/store/composer.store";

import { TipBtn } from "./components/TipBtn";
import { AISummary } from "./components/AISummary";
import { EmailCard } from "./components/EmailCard";
import { ThreadMeta } from "./components/ThreadMeta";
import { NotesDropdown } from "./components/NotesDropdown";
import { PanelShell } from "@/components/composer/shells/PanelShell";
import { useComposer } from "@/components/composer/hooks/useComposer";
import { SmartReplies } from "@/components/composer/SmartReplies";
import { QuickReply } from "./components/QuickReply";

// ─── Thread detail content ─────────────────────────────────────────────────────
function ThreadDetailContent({ threadId }: { threadId: string }) {
  const { data } = useThreadDetail(threadId);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadIds = useUIStore((s) => (s.threadIds as string[]) ?? []);
  const emailAction = useEmailAction();
  const [notesOpen, setNotesOpen] = useState(false);
  const notesAnchorRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowAnchorRef = useRef<HTMLDivElement>(null);

  const { replyTo, forward } = useComposer();
  const panelInstance = usePanelInstance();

  const emails = useMemo(
    () => (data.success ? data.data.emails : []) as FullEmail[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.success, data.success ? data.data.emails : null],
  );

  const subject = emails[0]?.subject || "(no subject)";
  const emailAddr = selectedEmail ?? emails[0]?.emailAddress ?? "";
  const lastEmail = emails[emails.length - 1];

  // For the reply target: use the last email NOT sent by the current user,
  // so the "To:" field in the composer is always pre-populated with the
  // other person's address (not our own).
  const lastIncomingEmail = useMemo(
    () =>
      emails.length > 0
        ? ([...emails].reverse().find((e) => e.from.email !== emailAddr) ??
          lastEmail)
        : lastEmail,
    [emails, emailAddr, lastEmail],
  );
  const anyStarred = useMemo(() => emails.some((e) => e.isStarred), [emails]);
  const isArchived = emails[0]?.isArchived ?? false;
  const isRead = useMemo(
    () => emails.length > 0 && emails.every((e) => e.isRead),
    [emails],
  );

  const currentIdx = threadIds.indexOf(threadId);
  const prevId = currentIdx > 0 ? threadIds[currentIdx - 1] : null;
  const nextId =
    currentIdx < threadIds.length - 1 ? threadIds[currentIdx + 1] : null;

  const dateRange = useMemo(() => {
    if (!emails.length) return "";
    return emails.length > 1
      ? `${format(new Date(emails[0].receivedAt), "MMM d")} – ${format(new Date(emails[emails.length - 1].receivedAt), "MMM d")}`
      : format(new Date(emails[0].receivedAt), "MMM d, h:mm a");
  }, [emails]);

  const act = useCallback(
    (
      email: FullEmail,
      action: Parameters<typeof emailAction.mutate>[0]["action"],
    ) =>
      emailAction.mutate({
        from: email.emailAddress,
        provider:
          email.provider?.toLowerCase() === "outlook" ? "OUTLOOK" : "GOOGLE",
        messageIds: [email.providerMessageId],
        action,
      }),
    [emailAction],
  );

  const handleStar = useCallback(() => {
    if (emails[0]) act(emails[0], anyStarred ? "unstar" : "star");
  }, [emails, anyStarred, act]);
  const handleArchive = useCallback(() => {
    if (emails[0]) act(emails[0], isArchived ? "unarchive" : "archive");
  }, [emails, isArchived, act]);
  const handleDelete = useCallback(() => {
    if (emails[0]) act(emails[0], "delete");
  }, [emails, act]);
  const handleRead = useCallback(() => {
    if (emails[0]) act(emails[0], isRead ? "mark_unread" : "mark_read");
  }, [emails, isRead, act]);
  const handleToggleNotes = useCallback(() => setNotesOpen((v) => !v), []);
  const handleReply = useCallback(() => {
    if (lastEmail) replyTo(lastEmail, "panel", "reply");
  }, [lastEmail, replyTo]);
  const handleReplyAll = useCallback(() => {
    if (lastEmail) replyTo(lastEmail, "panel", "reply_all");
  }, [lastEmail, replyTo]);
  const handleForward = useCallback(() => {
    if (lastEmail) forward(lastEmail, "panel");
  }, [lastEmail, forward]);

  // ── Close overflow on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (!overflowAnchorRef.current?.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      switch (e.key) {
        case "r":
          e.preventDefault();
          handleReply();
          break;
        case "f":
          e.preventDefault();
          handleForward();
          break;
        case "s":
          e.preventDefault();
          handleStar();
          break;
        case "e":
          e.preventDefault();
          handleArchive();
          break;
        case "#":
          e.preventDefault();
          handleDelete();
          break;
        case "u":
          e.preventDefault();
          handleRead();
          break;
        case "j":
          e.preventDefault();
          if (nextId) setActiveThread(nextId);
          break;
        case "k":
          e.preventDefault();
          if (prevId) setActiveThread(prevId);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    handleReply,
    handleForward,
    handleStar,
    handleArchive,
    handleDelete,
    handleRead,
    nextId,
    prevId,
    setActiveThread,
  ]);

  if (!data.success || emails.length === 0) return <ThreadDetailEmpty />;

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#1c1a18]">
      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center px-3 pt-3 pb-2 gap-1">
        <div className="flex items-center gap-0.5">
          <TipBtn onClick={() => setActiveThread(null)} tip="Close" kbd="Esc">
            <IconX size={15} />
          </TipBtn>
          <div className="w-px h-4 bg-black/[0.07] dark:bg-white/[0.07] mx-1" />
          <TipBtn
            onClick={() => prevId && setActiveThread(prevId)}
            tip="Previous"
            kbd="K"
            disabled={!prevId}
          >
            <IconChevronLeft size={16} />
          </TipBtn>
          <TipBtn
            onClick={() => nextId && setActiveThread(nextId)}
            tip="Next"
            kbd="J"
            disabled={!nextId}
          >
            <IconChevronRight size={16} />
          </TipBtn>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <TipBtn
            tip={anyStarred ? "Unstar" : "Star"}
            kbd="S"
            onClick={handleStar}
            className={
              anyStarred ? "text-amber-400 hover:text-amber-500" : undefined
            }
          >
            {anyStarred ? (
              <IconStarFilled size={16} className="text-amber-400" />
            ) : (
              <IconStar size={16} />
            )}
          </TipBtn>
          <TipBtn
            tip={isArchived ? "Move to inbox" : "Archive"}
            kbd="E"
            onClick={handleArchive}
          >
            {isArchived ? (
              <IconArchiveOff size={16} />
            ) : (
              <IconArchive size={16} />
            )}
          </TipBtn>
          <div ref={notesAnchorRef} className="relative">
            <TipBtn
              tip="Notes"
              kbd="N"
              active={notesOpen}
              onClick={handleToggleNotes}
            >
              <IconNotes size={16} />
            </TipBtn>
            {notesOpen && (
              <NotesDropdown
                threadId={threadId}
                emailAddress={emailAddr}
                onClose={() => setNotesOpen(false)}
              />
            )}
          </div>
          <div ref={overflowAnchorRef} className="relative">
            <TipBtn
              tip="More"
              active={overflowOpen}
              onClick={() => setOverflowOpen((v) => !v)}
            >
              <IconDots size={16} />
            </TipBtn>
            {overflowOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl overflow-hidden bg-white dark:bg-[#27241f] shadow-[0_4px_20px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] py-1">
                <button
                  onClick={() => { handleRead(); setOverflowOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-gray-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  {isRead ? <IconMailOpened size={13} /> : <IconMail size={13} />}
                  {isRead ? "Mark unread" : "Mark read"}
                  <kbd className="ml-auto text-[10px] font-mono text-gray-300 dark:text-white/20">U</kbd>
                </button>
                <div className="mx-2 my-1 border-t border-black/[0.05] dark:border-white/[0.05]" />
                <button
                  onClick={() => { handleDelete(); setOverflowOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <IconTrash size={13} />
                  Delete
                  <kbd className="ml-auto text-[10px] font-mono text-red-300 dark:text-red-900">#</kbd>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Subject + meta ── */}
      <div className="shrink-0 px-5 pb-4">
        <h2 className="text-[18px] font-bold text-gray-950 dark:text-white/90 leading-tight tracking-[-0.03em]">
          {subject}
        </h2>
        <ThreadMeta emails={emails} dateRange={dateRange} className="mt-2.5" />
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={null}>
          <AISummary
            threadId={threadId}
            emailAddress={emailAddr}
            variant="card"
          />
        </Suspense>

        <div className="px-5 py-3 space-y-2">
          {emails.map((email, i) => (
            <EmailCard
              key={email.id}
              email={email}
              defaultOpen={i === emails.length - 1}
              onStar={() => act(email, email.isStarred ? "unstar" : "star")}
            />
          ))}
        </div>

        {/* Spacer — only when panel is closed so last card clears the float bar */}
        {!panelInstance && <div className="h-16" />}
      </div>

      {/* Floating QuickReply card with AI reply suggestions */}
      {!panelInstance && (
        <QuickReply
          userEmail={emailAddr}
          lastEmail={lastIncomingEmail}
          variant="float"
          shell="panel"
        >
          {lastIncomingEmail && (
            <SmartReplies
              threadId={threadId}
              emailAddress={emailAddr}
              lastEmail={lastIncomingEmail}
              shell="panel"
              variant="rows"
            />
          )}
        </QuickReply>
      )}

      {/* ── Composer panel — slides up from bottom ── */}
      {panelInstance && <PanelShell instance={panelInstance} />}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ThreadDetailSkeleton() {
  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#1c1a18] p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-white dark:bg-[#201e1b] p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
              <Skeleton className="h-2.5 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreadDetailEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-2 text-center px-8 dark:bg-[#1c1a18]",
        className,
      )}
    >
      <span className="text-3xl opacity-10 select-none">✉</span>
      <p className="text-[13px] text-gray-400 dark:text-white/22">
        Select a thread to read
      </p>
    </div>
  );
}

export function ThreadDetail({ className }: { className?: string }) {
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  if (!activeThreadId) return <ThreadDetailEmpty className={className} />;
  return (
    <div
      className={cn("relative flex flex-col h-full overflow-hidden", className)}
    >
      <Suspense fallback={<ThreadDetailSkeleton />}>
        <ThreadDetailContent threadId={activeThreadId} />
      </Suspense>
    </div>
  );
}
