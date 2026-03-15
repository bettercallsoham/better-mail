"use client";

import { useState, useCallback, memo } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackCard } from "./FeedbackCard";
import { useUIStore } from "@/lib/store/ui.store";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackPostType, FeedbackSortOrder } from "@/features/feedback/feedback.type";
import { useFeedbackPosts } from "@/features/feedback/feedback.query";

const TYPE_FILTERS: { label: string; value: FeedbackPostType | "all" }[] = [
  { label: "All",          value: "all"             },
  { label: "Features",     value: "feature_request" },
  { label: "Bugs",         value: "bug_report"      },
  { label: "Improvements", value: "improvement"     },
  { label: "Questions",    value: "question"        },
];

const SORT_OPTIONS: { label: string; value: FeedbackSortOrder }[] = [
  { label: "New", value: "new" },
  { label: "Top", value: "top" },
];

// ── Skeletons ──────────────────────────────────────────────────────────────────

function FeedbackCardSkeleton() {
  return (
    <div className="flex items-start gap-4 px-4 py-4 rounded-xl border border-border bg-card">
      <div className="w-10 h-14 rounded-xl bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="h-2.5 w-14 rounded-full bg-muted animate-pulse" />
        <div className="h-3.5 w-3/4 rounded-full bg-muted animate-pulse" />
        <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function FeedbackBoardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <FeedbackCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────────

const FilterBar = memo(function FilterBar({
  activeType,
  activeSort,
  onTypeChange,
  onSortChange,
}: {
  activeType: FeedbackPostType | "all";
  activeSort: FeedbackSortOrder;
  onTypeChange: (t: FeedbackPostType | "all") => void;
  onSortChange: (s: FeedbackSortOrder) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Type pills — scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onTypeChange(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeType === f.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort toggle */}
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted shrink-0">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSortChange(s.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeSort === s.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
});

// ── Post list ──────────────────────────────────────────────────────────────────

function PostList({
  type,
  sort,
}: {
  type: FeedbackPostType | "all";
  sort: FeedbackSortOrder;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedbackPosts({
      type: type === "all" ? undefined : type,
      sort,
    });

  const posts = data.pages.flatMap((p) => p.data);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-9 h-9 rounded-xl border border-border flex items-center justify-center mb-3">
          <MessageSquarePlus
            size={16}
            strokeWidth={1.5}
            className="text-muted-foreground"
          />
        </div>
        <p className="text-[13px] font-medium text-foreground">No posts yet</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Be the first to share feedback
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <FeedbackCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className={cn(
            "w-full py-3 rounded-xl text-[12px] font-medium",
            "border border-border text-muted-foreground",
            "hover:bg-accent hover:text-foreground",
            "flex items-center justify-center gap-2",
            "transition-all duration-150",
          )}
        >
          {isFetchingNextPage ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            "Load more"
          )}
        </button>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function FeedbackBoard() {
  const [activeType, setActiveType] = useState<FeedbackPostType | "all">("all");
  const [activeSort, setActiveSort] = useState<FeedbackSortOrder>("new");
  const setFeedbackCreateOpen = useUIStore((s) => s.setFeedbackCreateOpen);

  const handleTypeChange = useCallback(
    (type: FeedbackPostType | "all") => setActiveType(type),
    [],
  );
  const handleSortChange = useCallback(
    (sort: FeedbackSortOrder) => setActiveSort(sort),
    [],
  );

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight">
            Feedback
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Share ideas, report bugs, vote on what matters
          </p>
        </div>

        <button
          onClick={() => setFeedbackCreateOpen(true)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold",
            "bg-foreground text-background",
            "hover:opacity-90 active:scale-[0.97]",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus size={13} strokeWidth={2.5} />
          New post
        </button>
      </div>

      <FilterBar
        activeType={activeType}
        activeSort={activeSort}
        onTypeChange={handleTypeChange}
        onSortChange={handleSortChange}
      />

      <PostList type={activeType} sort={activeSort} />
    </div>
  );
}