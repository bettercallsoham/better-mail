"use client";

import { useState, useCallback } from "react";
import { useInboxZero } from "@/features/mailbox/mailbox.query";
import { InboxZeroEmail } from "@/features/mailbox/mailbox.type";
import { InboxZeroCard } from "./InboxZeroCard";
import { InboxZeroEmailDialog } from "./InboxZeroEmailDialog";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function InboxZeroSection() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInboxZero();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const emails: InboxZeroEmail[] = data.pages.flatMap((p) => p.emails);
  const total = data.pages[0]?.total ?? 0;

  const selectedEmail =
    selectedIdx !== null ? (emails[selectedIdx] ?? null) : null;

  const handleNext = useCallback(() => {
    if (selectedIdx === null) return;
    const nextIdx = selectedIdx + 1;
    if (nextIdx < emails.length) {
      setSelectedIdx(nextIdx);
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().then(() => setSelectedIdx(nextIdx));
    }
  }, [
    selectedIdx,
    emails.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const handlePrev = useCallback(() => {
    if (selectedIdx === null || selectedIdx === 0) return;
    setSelectedIdx(selectedIdx - 1);
  }, [selectedIdx]);

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-400 dark:text-neutral-500">
        <Inbox size={32} strokeWidth={1.2} />
        <p className="text-[14px] font-medium">
          Inbox zero — you&apos;re all caught up
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            Inbox Zero
          </h2>
          <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            {total} email{total !== 1 ? "s" : ""} need your attention
          </p>
        </div>
      </div>

      {/* Email cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {emails.map((email, idx) => (
          <InboxZeroCard
            key={email.id}
            email={email}
            onClick={() => setSelectedIdx(idx)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className={cn(
            "self-center mt-2 px-5 py-2 rounded-xl text-[13px] font-medium transition-colors",
            "border border-neutral-200 dark:border-neutral-800",
            "text-neutral-600 dark:text-neutral-300",
            "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}

      {/* Email dialog */}
      <InboxZeroEmailDialog
        email={selectedEmail}
        onClose={() => setSelectedIdx(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={selectedIdx !== null && selectedIdx > 0}
        hasNext={
          selectedIdx !== null &&
          (selectedIdx < emails.length - 1 || !!hasNextPage)
        }
      />
    </div>
  );
}
