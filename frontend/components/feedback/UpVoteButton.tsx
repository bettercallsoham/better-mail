"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToggleUpvote } from "@/features/feedback/feedback.query";

interface UpvoteButtonProps {
  postId: string;
  initialCount: number;
  initialHasUpvoted: boolean;
  orientation?: "vertical" | "horizontal";
}

export function UpvoteButton({
  postId,
  initialCount,
  initialHasUpvoted,
  orientation = "vertical",
}: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const { mutate, isPending } = useToggleUpvote();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !hasUpvoted;
    setHasUpvoted(next);
    setCount((c) => (next ? c + 1 : c - 1));
    mutate(postId, {
      onError: () => {
        setHasUpvoted(!next);
        setCount((c) => (next ? c - 1 : c + 1));
      },
      onSuccess: (data) => {
        setCount(data.data.upvoteCount);
        setHasUpvoted(data.data.upvoted);
      },
    });
  };

  if (orientation === "horizontal") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg",
          "border text-[12px] font-semibold tabular-nums",
          "transition-all duration-150 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasUpvoted
            ? "border-blue-500/40 text-blue-500 dark:text-blue-400"
            : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
        )}
      >
        <ChevronUp
          size={13}
          strokeWidth={hasUpvoted ? 2.5 : 1.5}
          className={cn(
            "transition-transform duration-150",
            hasUpvoted && "-translate-y-px",
          )}
        />
        {count}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        "w-10 py-2.5 rounded-xl border shrink-0",
        "transition-all duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        hasUpvoted
          ? "border-blue-500/30 text-blue-500 dark:text-blue-400"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      <ChevronUp
        size={13}
        strokeWidth={hasUpvoted ? 2.5 : 1.5}
        className={cn(
          "transition-transform duration-150",
          hasUpvoted && "-translate-y-px",
        )}
      />
      <span className="text-[11px] font-semibold tabular-nums leading-none">
        {count}
      </span>
    </button>
  );
}