"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadEmails,
  useMailboxPrefetch,
} from "@/features/mailbox/mailbox.query";
import { useThreadNavigation } from "@/hooks/keyboard/useThreadNavigation";
import { ThreadRow } from "./ThreadRow";
import { ClientOnly } from "@/components/ClientOnly";
import { Skeleton } from "@/components/ui/skeleton";
import { groupByDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export function ThreadList({ className }: { className?: string }) {
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/*
        ClientOnly prevents Next.js from SSR-ing useSuspenseQuery calls
        that hit the API before auth cookies exist → kills the 401 error.
      */}
      <ClientOnly fallback={<ThreadListSkeleton />}>
        <Suspense fallback={<ThreadListSkeleton />}>
          <ThreadListContent email={selectedEmail ?? undefined} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

function ThreadListContent({ email }: { email?: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useThreadEmails(email);

  const activeThreadId   = useUIStore((s) => s.activeThreadId);
  const focusedThreadId  = useUIStore((s) => s.focusedThreadId);
  const layoutMode       = useUIStore((s) => s.layoutMode);
  const setActiveThread  = useUIStore((s) => s.setActiveThread);
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const setThreadIds     = useUIStore((s) => s.setThreadIds);
  const { prefetchThread } = useMailboxPrefetch();

  // Keep store threadIds in sync for overlay prev/next navigation
  useEffect(() => {
    setThreadIds(data.threadIds);
  }, [data.threadIds, setThreadIds]);

  useThreadNavigation(data.threadIds);

  // Infinite scroll sentinel
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  if (!data.threads.length) return <ThreadListEmpty />;

  const groups = groupByDate(data.threads);
  const isFlow = layoutMode === "flow";

  return (
    <div className={cn("flex-1 overflow-y-auto overscroll-contain", isFlow && "py-1")}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-white/90 dark:bg-[#111]/90 backdrop-blur-sm border-b border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-white/25 select-none">
              {label}
            </span>
          </div>

          {items.map((thread) => (
            <ThreadRow
              key={thread.threadId}
              thread={thread}
              mode={isFlow ? "flow" : "velocity"}
              isActive={thread.threadId === activeThreadId}
              isFocused={thread.threadId === focusedThreadId}
              onSelect={() => setActiveThread(thread.threadId)}
              onHover={() => {
                setFocusedThread(thread.threadId);
                prefetchThread(thread.threadId);
              }}
            />
          ))}
        </div>
      ))}

      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-gray-500 dark:border-white/10 dark:border-t-white/40 animate-spin" />
        </div>
      )}
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 h-[48px] border-b border-black/[0.04] dark:border-white/[0.04]"
        >
          <Skeleton className="w-[7px] h-[7px] rounded-full" />
          <Skeleton className="w-[140px] h-3 rounded" />
          <Skeleton className="flex-1 h-3 rounded" />
          <Skeleton className="w-10 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

function ThreadListEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
      <span className="text-2xl opacity-25 select-none">✦</span>
      <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
        You&apos;re all caught up
      </p>
    </div>
  );
}