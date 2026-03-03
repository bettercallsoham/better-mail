"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  memo,
} from "react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadEmails,
  useMailboxPrefetch,
  useSearchEmails,
} from "@/features/mailbox/mailbox.query";
import { useThreadNavigation } from "@/hooks/keyboard/useThreadNavigation";
import { useThreadActions } from "@/hooks/keyboard/useThreadActions";
import { useComposerStore } from "@/lib/store/composer.store";
import type { ThreadActions } from "@/hooks/keyboard/useThreadActions";
import { ThreadRow } from "../ThreadRow";
import { ThreadListToolbar } from "./ThreadListToolbar";
import { ClientOnly } from "@/components/ClientOnly";
import { Skeleton } from "@/components/ui/skeleton";
import { groupByDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { SearchEmail, ThreadEmail } from "@/features/mailbox/mailbox.type";
import type { SearchFilters } from "@/lib/store/ui.store";
import { stripMark } from "../../MailSearchCommand/ResultsList";

// ─── Infinite scroll ──────────────────────────────────────────────────────────
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
        ([entry]) => {
          if (entry.isIntersecting) onIntersect();
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [onIntersect, enabled],
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
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

// ─── Inner ────────────────────────────────────────────────────────────────────
function ThreadListInner({ email }: { email?: string }) {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const searchFilters = useUIStore((s) => s.searchFilters);

  if (searchQuery || searchFilters) {
    return (
      <Suspense fallback={<ThreadListSkeleton />}>
        <SearchResultsList
          query={searchQuery ?? ""}
          filters={searchFilters}
          email={email}
        />
      </Suspense>
    );
  }

  return <ThreadListContent email={email} />;
}

// ─── Search results ───────────────────────────────────────────────────────────
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
  const activeThreadId = useUIStore((s) => s.activeThreadId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchEmails({
      query: query.trim() || " ",
      size: 20,
      ...filters,
      labels: filters?.labels?.join(","),
    });

  const allEmails = data.pages.flatMap((p) => p.emails);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sentinelRef = useInfiniteScroll(
    loadMore,
    hasNextPage && !isFetchingNextPage,
  );

  if (!allEmails.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="text-2xl opacity-20 select-none">◎</span>
        <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
          {query
            ? `No results for "${query}"`
            : "No results for the selected filters"}
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
      {allEmails.map((e) => (
        <SearchResultRow
          key={e.id}
          email={e}
          isActive={e.threadId === activeThreadId}
          onSelect={() => setActiveThread(e.threadId)}
        />
      ))}
      <div ref={sentinelRef} className="h-4" />
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}

// ─── Search row ───────────────────────────────────────────────────────────────
const SearchResultRow = memo(function SearchResultRow({
  email,
  isActive,
  onSelect,
}: {
  email: SearchEmail;
  isActive: boolean;
  onSelect: () => void;
}) {
  const date = new Date(email.receivedAt);
  const isToday = new Date().toDateString() === date.toDateString();
  const dateStr = isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });

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
        {!email.isRead ? (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
        ) : (
          <span className="w-1.5 h-1.5 block" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              "text-[12.5px] truncate",
              !email.isRead
                ? "font-semibold text-gray-900 dark:text-white/90"
                : "font-medium text-gray-600 dark:text-white/50",
            )}
          >
            {email.from.name || email.from.email}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-white/22 shrink-0">
            {dateStr}
          </span>
        </div>
        <p
          className={cn(
            "text-[12.5px] truncate mb-0.5",
            !email.isRead
              ? "font-medium text-gray-800 dark:text-white/75"
              : "text-gray-600 dark:text-white/45",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedSubject }}
        />
        <p className="text-[11.5px] text-gray-400 dark:text-white/28 truncate">
          {stripMark(email.snippet)}
        </p>
      </div>
    </button>
  );
});

// ─── Thread row with actions ──────────────────────────────────────────────────
const ThreadRowWithActions = memo(function ThreadRowWithActions({
  thread,
  isActive,
  isFocused,
  isFlow,
  focusedActionsRef,
  onSelect,
  onHover,
}: {
  thread: ThreadEmail;
  isActive: boolean;
  isFocused: boolean;
  isFlow: boolean;
  focusedActionsRef: React.MutableRefObject<ThreadActions | null>;
  onSelect: () => void;
  onHover: () => void;
}) {
  const actions = useThreadActions(thread);

  // Keep ref current so the list-level keyboard handler always has
  // fresh callbacks without re-registering the listener
  useLayoutEffect(() => {
    if (isFocused) focusedActionsRef.current = actions;
  });

  // Auto-mark as read when a thread is opened
  const handleSelect = useCallback(() => {
    onSelect();
    if (thread.isUnread) {
      actions.markRead();
    }
  }, [onSelect, thread.isUnread, actions]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThreadRow
      thread={thread}
      isActive={isActive}
      isFocused={isFocused}
      mode={isFlow ? "flow" : "velocity"}
      actions={actions}
      onSelect={handleSelect}
      onHover={onHover}
    />
  );
});

// ─── Normal thread list ───────────────────────────────────────────────────────
function ThreadListContent({ email: emailAddress }: { email?: string }) {
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const focusedThreadId = useUIStore((s) => s.focusedThreadId);
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const setFocusedThread = useUIStore((s) => s.setFocusedThread);
  const setThreadIds = useUIStore((s) => s.setThreadIds);
  const activeFolder = useUIStore((s) => s.activeFolder);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useThreadEmails(emailAddress, activeFolder);

  const { prefetchThread } = useMailboxPrefetch();

  const focusedActionsRef = useRef<ThreadActions | null>(null);

  const threadIdsKey = data.threadIds.join(",");
  useEffect(() => {
    setThreadIds(data.threadIds);
  }, [threadIdsKey, setThreadIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useThreadNavigation(data.threadIds, focusedActionsRef);

  // ── Single S/U/E handler — reads ref at call time, never stale ───────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      // Don't fire while a compose dialog is open
      if (
        useComposerStore.getState().instances.some((i) => i.shell === "dialog")
      )
        return;

      // Yield to ThreadDetail when a thread is open — it owns s/e/u in that context
      if (useUIStore.getState().activeThreadId) return;

      const actions = focusedActionsRef.current;
      if (!actions) return;

      switch (e.key.toLowerCase()) {
        case "s":
          e.preventDefault();
          actions.star();
          break;
        case "u":
          e.preventDefault();
          actions.markRead();
          break;
        case "e":
          e.preventDefault();
          actions.archiveToggle();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sentinelRef = useInfiniteScroll(
    loadMore,
    hasNextPage && !isFetchingNextPage,
  );

  if (!data.threads.length) return <ThreadListEmpty />;

  const groups = groupByDate(data.threads);
  const isFlow = layoutMode === "flow";

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overscroll-contain",
        isFlow && "py-1",
      )}
    >
      {groups.map(({ label, items }) => (
        <div key={label}>
          {/* Fixed sticky header — matches body bg, no jarring banding */}
          <div className="sticky top-0 z-10 px-4 py-1.5 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-sm border-b border-black/[0.04] dark:border-white/[0.04]">
            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-gray-400 dark:text-white/22 select-none">
              {label}
            </span>
          </div>

          {items.map((thread) => (
            <ThreadRowWithActions
              key={thread.threadId}
              thread={thread}
              isActive={thread.threadId === activeThreadId}
              isFocused={thread.threadId === focusedThreadId}
              isFlow={isFlow}
              focusedActionsRef={focusedActionsRef}
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

// ─── Spinner ──────────────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex justify-center py-3">
      <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-gray-500 dark:border-white/[0.10] dark:border-t-white/40 animate-spin" />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function ThreadListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 h-12 border-b border-black/[0.04] dark:border-white/[0.04]"
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

// ─── Empty ────────────────────────────────────────────────────────────────────
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
