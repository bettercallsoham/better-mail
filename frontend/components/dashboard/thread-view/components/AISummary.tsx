"use client";

import { useState, useCallback } from "react";
import {
  IconSparkles,
  IconCopy,
  IconCheck,
  IconChevronDown,
  IconBolt,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useThreadSummary } from "@/features/ai/ai.query";
import { cn } from "@/lib/utils";

interface AISummaryProps {
  threadId: string;
  emailAddress: string;
  variant?: "card" | "bar";
}

export function AISummary({
  threadId,
  emailAddress,
  variant = "card",
}: AISummaryProps) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const s = data?.summary;

  const copy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!s?.text) return;
      navigator.clipboard
        .writeText(
          [s.text, s.keyPoints, s.actionItems].filter(Boolean).join("\n\n"),
        )
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
    },
    [s],
  );

  if (!isLoading && !s?.text) return null;

  const hasKeyPoints = !!s?.keyPoints && String(s.keyPoints).trim().length > 0;
  const hasAction = !!s?.actionItems && String(s.actionItems).trim().length > 0;

  // ── Bar variant (used in overlay) ────────────────────────────────────────────
  if (variant === "bar") {
    if (isLoading) {
      return (
        <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 bg-violet-50/80 dark:bg-violet-950/20 border-b border-violet-100/80 dark:border-violet-900/30">
          <IconSparkles
            size={12}
            className="text-violet-400 shrink-0 animate-pulse"
          />
          <Skeleton className="h-2.5 flex-1 max-w-sm rounded-full" />
        </div>
      );
    }
    return (
      <div className="shrink-0 flex items-start gap-2.5 px-5 py-2.5 bg-violet-50/60 dark:bg-violet-950/15 border-b border-violet-100/60 dark:border-violet-900/25">
        <IconSparkles
          size={12}
          className="text-violet-500 dark:text-violet-400 shrink-0 mt-0.5"
        />
        <p className="flex-1 text-[12px] text-gray-600 dark:text-white/50 leading-relaxed">
          {s!.text}
        </p>
        {s?.actionItems && (
          <span className="text-[10px] text-gray-400 dark:text-white/25 shrink-0 mt-0.5 capitalize">
            {String(s.actionItems).slice(0, 40)}
          </span>
        )}
      </div>
    );
  }

  // ── Card variant (used in ThreadDetail) ──────────────────────────────────────
  return (
    <div
      className={cn(
        "mx-4 sm:mx-6 mt-4 rounded-2xl overflow-hidden",
        "bg-white/60 dark:bg-white/3",
        "ring-1 ring-black/5 dark:ring-white/[0.07]",
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
      >
        <div className="w-5 h-5 rounded-md bg-black/4 dark:bg-white/[0.07] flex items-center justify-center shrink-0">
          <IconSparkles
            size={11}
            className="text-gray-500 dark:text-white/40"
          />
        </div>
        <span className="text-[11px] font-semibold text-gray-400 dark:text-white/30 select-none shrink-0 tracking-[0.07em] uppercase">
          AI Summary
        </span>

        {!expanded && (
          <span
            className={cn(
              "flex-1 min-w-0 text-[12px] leading-snug truncate tracking-[-0.005em]",
              isLoading
                ? "text-transparent"
                : "text-gray-500 dark:text-white/42",
            )}
          >
            {isLoading ? (
              <Skeleton className="h-2.5 w-full rounded-full max-w-55 inline-block" />
            ) : (
              s?.text
            )}
          </span>
        )}
        {expanded && <span className="flex-1" />}

        <div className="flex items-center gap-0.5 shrink-0">
          {s?.text && !isLoading && (
            <span
              role="button"
              onClick={copy}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/5 dark:hover:bg-white/6 transition-colors"
            >
              {copied ? (
                <IconCheck size={11} className="text-emerald-500" />
              ) : (
                <IconCopy size={11} />
              )}
            </span>
          )}
          <span className="w-5 h-5 flex items-center justify-center">
            <IconChevronDown
              size={13}
              className={cn(
                "text-gray-300 dark:text-white/20 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </span>
        </div>
      </button>

      {/* Collapsed action pill */}
      {!expanded && !isLoading && hasAction && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg bg-black/3 dark:bg-white/4">
            <IconBolt
              size={10}
              className="text-gray-400 dark:text-white/25 shrink-0"
            />
            <p className="text-[11px] text-gray-500 dark:text-white/38 leading-snug truncate">
              {String(s!.actionItems)}
            </p>
          </div>
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-black/4 dark:border-white/5">
          {isLoading ? (
            <div className="space-y-1.5 pt-3">
              {[100, 88, 72].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-2.5 rounded-full"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : (
            <>
              <p className="text-[13px] text-gray-600 dark:text-white/52 leading-relaxed pt-3 tracking-[-0.005em]">
                {s!.text}
              </p>
              {hasKeyPoints && (
                <div className="space-y-2">
                  <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-300 dark:text-white/20 select-none">
                    Highlights
                  </p>
                  <ul className="space-y-1.5">
                    {String(s!.keyPoints)
                      .split("\n")
                      .filter(Boolean)
                      .map((pt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[12.5px] text-gray-500 dark:text-white/38 leading-snug"
                        >
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-300 dark:bg-white/18 shrink-0" />
                          {pt}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {hasAction && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/2.5 dark:bg-white/4 ring-1 ring-black/4 dark:ring-white/6">
                  <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/8 shrink-0 mt-px">
                    <IconBolt
                      size={11}
                      className="text-gray-500 dark:text-white/38"
                    />
                  </div>
                  <div>
                    <p className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-gray-300 dark:text-white/22 mb-1">
                      Action needed
                    </p>
                    <p className="text-[12px] text-gray-600 dark:text-white/52 leading-snug">
                      {String(s!.actionItems)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
