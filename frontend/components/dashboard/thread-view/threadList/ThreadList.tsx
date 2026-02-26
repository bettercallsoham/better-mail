"use client";

import { Suspense, useCallback, useEffect, useRef, memo } from "react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadEmails,
  useMailboxPrefetch,
  useSearchEmails,
} from "@/features/mailbox/mailbox.query";
import { useThreadNavigation } from "@/hooks/keyboard/useThreadNavigation";
import { ThreadRow } from "../ThreadRow";
import { ThreadListToolbar } from "./ThreadListToolbar";
import { ClientOnly } from "@/components/ClientOnly";
import { Skeleton } from "@/components/ui/skeleton";
import { groupByDate } from "@/lib/date";
import { cn } from "@/lib/utils";
// ✅ Import shared utils — no more duplication
import type { SearchEmail } from "@/features/mailbox/mailbox.type";
import type { SearchFilters } from "@/lib/store/ui.store";
import { stripMark } from "../../MailSearchCommand/ResultsList";

// ─────────────────────────────────────────────────────────────────────────────
// Shared infinite-scroll hook — extracted from both list components
// ─────────────────────────────────────────────────────────────────────────────

function useInfiniteScroll(
  onIntersect: () => void,
  enabled: boolean,
): (node: HTMLDivElement | null) => void {
  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node || !enabled) return;
      observerRef.current = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) onIntersect(); },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    // onIntersect identity matters — callers should wrap in useCallback
    [onIntersect, enabled],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export function ThreadList({ className }: { className?: string }) {
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ThreadListToolbar />
      <ClientOnly fallback={<ThreadListSkeleton />}>
        <Suspense fallback={<ThreadListSkeleton />}>
          <ThreadListInner email={selectedEmail ?? undefined} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner — branches on searchQuery
// ─────────────────────────────────────────────────────────────────────────────

function ThreadListInner({ email }: { email?: string }) {
  const searchQuery   = useUIStore((s) => s.searchQuery);
  const searchFilters = useUIStore((s) => s.searchFilters);

  if (searchQuery || searchFilters) {
    return (
      <Suspense fallback={<ThreadListSkeleton />}>
        <SearchResultsList query={searchQuery ?? ""} filters={searchFilters} email={email} />
      </Suspense>
    );
  }

  return <ThreadListContent email={email} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Results
// ─────────────────────────────────────────────────────────────────────────────

function SearchResultsList({
  query,
  filters,
  email,
}: {
  query: string;
  filters: SearchFilters | null;
  email?: string;
}) {
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const activeThreadId  = useUIStore((s) => s.activeThreadId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchEmails({ query: query.trim() || " ", size: 20, ...filters });

  const allEmails = data.pages.flatMap((p) => p.emails);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sentinelRef = useInfiniteScroll(loadMore, hasNextPage && !isFetchingNextPage);

  if (!allEmails.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-2xl opacity-20 select-none">◎</span>
        <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
          {query ? `No results for "${query}"` : "No results for the selected filters"}
        </p>
        <p className="text-[12px] text-gray-400 dark:text-white/25">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="px-4 py-2 border-b border-black/4 dark:border-white/4">
        <span className="text-[11px] text-gray-400 dark:text-white/30">
          {data.pages[0].total} result{data.pages[0].total !== 1 ? "s" : ""}
        </span>
      </div>

      {allEmails.map((email) => (
        <SearchResultRow
          key={email.id}
          email={email}
          isActive={email.threadId === activeThreadId}
          onSelect={() => setActiveThread(email.threadId)}
        />
      ))}

      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search result row — memoized, reuses shared utils
// ─────────────────────────────────────────────────────────────────────────────

const SearchResultRow = memo(function SearchResultRow({
  email,
  isActive,
  onSelect,
}: {
  email: SearchEmail;
  isActive: boolean;
  onSelect: () => void;
}) {
  const date     = new Date(email.receivedAt);
  const isToday  = new Date().toDateString() === date.toDateString();
  const dateStr  = isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });

  // ✅ Use shared applyHighlight from ResultsList — no duplication
  const highlightedSubject = email.subject.replace(
    /<mark>(.*?)<\/mark>/g,
    '<mark class="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 not-italic font-semibold rounded-[2px] px-px">$1</mark>',
  );

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 border-b border-black/4 dark:border-white/3 text-left transition-colors",
        isActive
          ? "bg-black/4 dark:bg-white/5"
          : "hover:bg-black/2 dark:hover:bg-white/2",
      )}
    >
      <div className="mt-1.5 shrink-0">
        {!email.isRead
          ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
          : <span className="w-1.5 h-1.5 block" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            "text-[12.5px] truncate",
            !email.isRead
              ? "font-semibold text-gray-900 dark:text-white"
              : "font-medium text-gray-600 dark:text-white/55",
          )}>
            {email.from.name || email.from.email}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-white/25 shrink-0">{dateStr}</span>
        </div>

        <p
          className={cn(
            "text-[12.5px] truncate mb-0.5",
            !email.isRead
              ? "font-medium text-gray-800 dark:text-white/90"
              : "text-gray-600 dark:text-white/50",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedSubject }}
        />

        <p className="text-[11.5px] text-gray-400 dark:text-white/30 truncate">
          {stripMark(email.snippet)}
        </p>
      </div>
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Normal thread list
// ─────────────────────────────────────────────────────────────────────────────

function ThreadListContent({ email }: { email?: string }) {
  const activeThreadId   = useUIStore((s) => s.activeThreadId);
  const focusedThreadId  = useUIStore((s) => s.focusedThreadId);
  const layoutMode       = useUIStore((s) => s.layoutMode);
  const setActiveThread  = useUIStore((s) => s.setActiveThread);
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const setThreadIds     = useUIStore((s) => s.setThreadIds);
  const activeFolder     = useUIStore((s) => s.activeFolder);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useThreadEmails(email, activeFolder);

  const { prefetchThread } = useMailboxPrefetch();

  // ✅ Stable string key — avoids infinite loop from new array refs
  const threadIdsKey = data.threadIds.join(",");
  useEffect(() => {
    setThreadIds(data.threadIds);
  }, [threadIdsKey, setThreadIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useThreadNavigation(data.threadIds);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ✅ Shared infinite scroll hook — no duplicated IntersectionObserver setup
  const sentinelRef = useInfiniteScroll(loadMore, hasNextPage && !isFetchingNextPage);

  if (!data.threads.length) return <ThreadListEmpty />;

  const groups = groupByDate(data.threads);
  const isFlow = layoutMode === "flow";

  return (
    <div className={cn("flex-1 overflow-y-auto overscroll-contain", isFlow && "py-1")}>
      {groups.map(({ label, items }) => (
        <div key={label}>
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-white/90 dark:bg-[#111]/90 backdrop-blur-sm border-b border-black/4 dark:border-white/4">
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
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared loading spinner
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-3">
      <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-gray-500 dark:border-white/10 dark:border-t-white/40 animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeletons & Empty
// ─────────────────────────────────────────────────────────────────────────────

function ThreadListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 h-12 border-b border-black/4 dark:border-white/4"
        >
          <Skeleton className="w-1.5 h-1.5 rounded-full" />
          <Skeleton className="w-32 h-3 rounded" />
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