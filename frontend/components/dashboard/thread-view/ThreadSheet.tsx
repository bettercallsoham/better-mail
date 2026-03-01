"use client";

import { Suspense, useMemo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail,
  useEmailAction,
} from "@/features/mailbox/mailbox.query";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { cn } from "@/lib/utils";
import { useSheetInstance } from "@/lib/store/composer.store";

import { TipBtn } from "./components/TipBtn";
import { EmailCard } from "./components/EmailCard";
import { QuickReply } from "./components/QuickReply";
import { ThreadMeta } from "./components/ThreadMeta";
import { SheetShell } from "@/components/composer/shells/SheetShell";
import { useComposer } from "@/components/composer/hooks/useComposer";
// ─── Sheet content ─────────────────────────────────────────────────────────────
function SheetContent({ threadId }: { threadId: string }) {
  const { data } = useThreadDetail(threadId);
  const setActive = useUIStore((s) => s.setActiveThread);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadIds = useUIStore((s) => (s.threadIds as string[]) ?? []);
  const emailAction = useEmailAction();

  const { replyTo, forward } = useComposer();
  const sheetInstance = useSheetInstance();

  const emails = useMemo(
    () => (data.success ? data.data.emails : []) as FullEmail[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.success, data.success ? data.data.emails : null],
  );

  const subject = emails[0]?.subject ?? "(no subject)";
  const emailAddr = selectedEmail ?? emails[0]?.emailAddress ?? "";
  const lastEmail = emails[emails.length - 1];

  const currentIdx = threadIds.indexOf(threadId);
  const prevId = currentIdx > 0 ? threadIds[currentIdx - 1] : null;
  const nextId =
    currentIdx < threadIds.length - 1 ? threadIds[currentIdx + 1] : null;

  const act = useCallback(
    (
      email: FullEmail,
      action: Parameters<typeof emailAction.mutate>[0]["action"],
    ) =>
      emailAction.mutate({
        from: email.from.email,
        provider:
          email.provider?.toLowerCase() === "outlook" ? "OUTLOOK" : "GOOGLE",
        messageIds: [email.id],
        action,
      }),
    [emailAction],
  );

  const handleDelete = useCallback(() => {
    if (emails[0]) act(emails[0], "delete");
  }, [emails, act]);
  const handleReply = useCallback(() => {
    if (lastEmail) replyTo(lastEmail, "sheet", "reply");
  }, [lastEmail, replyTo]);
  const handleForward = useCallback(() => {
    if (lastEmail) forward(lastEmail, "sheet");
  }, [lastEmail, forward]);

  if (!data.success || emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-gray-400 dark:text-white/22">
          Nothing to show
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1 px-3 pt-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          onClick={() => setActive(null)}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/65 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all mr-1"
        >
          <IconX size={16} />
        </button>
        <p className="flex-1 min-w-0 text-[13px] font-semibold text-gray-800 dark:text-white/80 truncate tracking-[-0.01em]">
          {subject}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          <TipBtn
            onClick={() => prevId && setActive(prevId)}
            tip="Previous"
            kbd="K"
            disabled={!prevId}
          >
            <IconChevronLeft size={15} />
          </TipBtn>
          <TipBtn
            onClick={() => nextId && setActive(nextId)}
            tip="Next"
            kbd="J"
            disabled={!nextId}
          >
            <IconChevronRight size={15} />
          </TipBtn>
          <div className="w-px h-4 bg-black/[0.07] dark:bg-white/[0.07] mx-0.5" />
          <TipBtn
            tip="Delete"
            kbd="#"
            className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleDelete}
          >
            <IconTrash size={15} />
          </TipBtn>
        </div>
      </div>

      {/* Email cards */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-2">
        {emails.map((email, i) => (
          <EmailCard
            key={email.id}
            email={email}
            defaultOpen={i === emails.length - 1}
            onReply={handleReply}
            onForward={handleForward}
            onStar={() => act(email, email.isStarred ? "unstar" : "star")}
          />
        ))}
      </div>

      {/* Quick reply / composer */}
      {!sheetInstance ? (
        <QuickReply
          userEmail={emailAddr}
          lastEmail={lastEmail}
          variant="inline"
          shell="sheet"
        />
      ) : (
        <SheetShell instance={sheetInstance} />
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SheetSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-1/2 rounded" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-7 h-7 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/3 rounded" />
              <Skeleton className="h-2.5 w-1/2 rounded" />
            </div>
            <Skeleton className="h-2.5 w-16 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Portal ────────────────────────────────────────────────────────────────────
export function ThreadSideSheet() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const setActive = useUIStore((s) => s.setActiveThread);

  // THE FIX: wait for client mount before creating portal.
  // Server renders null → client hydrates null → then mounts. No mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isOpen =
    !!activeThreadId && (layoutMode === "velocity" || layoutMode === "zen");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setActive]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-200",
          "bg-black/[0.18] dark:bg-black/[0.35]",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setActive(null)}
      />
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50",
          "w-full sm:w-[520px] lg:w-[580px] flex flex-col",
          "bg-white dark:bg-[#191919]",
          "border-l border-black/[0.06] dark:border-white/[0.07]",
          "shadow-[-16px_0_48px_rgba(0,0,0,0.06)] dark:shadow-[-16px_0_48px_rgba(0,0,0,0.5)]",
          "transition-transform duration-200 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {activeThreadId && (
          <Suspense fallback={<SheetSkeleton />}>
            <SheetContent threadId={activeThreadId} />
          </Suspense>
        )}
      </div>
    </>,
    document.body,
  );
}
