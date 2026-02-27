"use client";

import { memo, useMemo } from "react";
import { Clock, Bookmark, BookmarkCheck, Paperclip, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateSavedSearch } from "@/features/mailbox/mailbox.query";
import type { SearchEmail } from "@/features/mailbox/mailbox.type";

// ─────────────────────────────────────────────────────────────────────────────
// Shared utils
// ─────────────────────────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  const d       = new Date(iso);
  const now     = new Date();
  const diffMs  = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffHr  < 48) return "Yesterday";
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

export function stripMark(html: string): string {
  return html.replace(/<\/?mark[^>]*>/g, "");
}

export function applyHighlight(html: string): string {
  return html.replace(
    /<mark>(.*?)<\/mark>/g,
    '<mark class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-[2px] px-px not-italic font-semibold">$1</mark>',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section heading — Notion-style low-opacity label
// ─────────────────────────────────────────────────────────────────────────────

export function SectionHead({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
      <span className={cn(
        "text-[10px] font-semibold tracking-[0.09em] uppercase select-none",
        "text-gray-400/70 dark:text-white/[0.25]",
      )}>
        {label}
      </span>
      {meta && (
        <span className="text-[10.5px] tabular-nums text-gray-400/60 dark:text-white/[0.2]">
          {meta}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Save button
// ─────────────────────────────────────────────────────────────────────────────

const SaveBtn = memo(function SaveBtn({ text }: { text: string }) {
  const create = useCreateSavedSearch();

  if (create.isSuccess) {
    return <BookmarkCheck className="w-3 h-3 text-green-500 shrink-0" />;
  }

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        create.mutate({ name: text, query: { searchText: text, filters: {} } });
      }}
      className={cn(
        "opacity-0 group-hover/row:opacity-100 shrink-0 p-0.5 rounded transition-all",
        "text-gray-300 dark:text-white/[0.18]",
        "hover:text-gray-500 dark:hover:text-white/50",
      )}
    >
      <Bookmark className="w-3 h-3" />
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Recent search row
// ─────────────────────────────────────────────────────────────────────────────

export const RecentRow = memo(function RecentRow({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/row w-full flex items-center gap-2.5 px-3 py-1.5 text-left rounded-lg mx-1 transition-colors",
        "hover:bg-gray-50 dark:hover:bg-white/[0.04]",
      )}
      style={{ width: "calc(100% - 8px)" }}
    >
      <Clock className="w-3 h-3 text-gray-300 dark:text-white/[0.15] shrink-0" />
      <span className="flex-1 text-[13px] text-gray-500 dark:text-white/[0.42] truncate">{text}</span>
      <SaveBtn text={text} />
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Thread row — custom memo comparator unchanged
// ─────────────────────────────────────────────────────────────────────────────

interface ThreadRowProps {
  from: string;
  subject: string;
  snippet?: string;
  date: string;
  isUnread: boolean;
  hasAttachment?: boolean;
  isStarred?: boolean;
  focused: boolean;
  onHover: () => void;
  onClick: () => void;
}

export const ThreadRow = memo(function ThreadRow({
  from,
  subject,
  snippet,
  date,
  isUnread,
  hasAttachment,
  isStarred,
  focused,
  onHover,
  onClick,
}: ThreadRowProps) {
  const highlightedSubject = useMemo(() => applyHighlight(subject), [subject]);
  const formattedDate      = useMemo(() => fmtDate(date),           [date]);
  const plainSnippet       = useMemo(() => snippet ? stripMark(snippet).slice(0, 90) : null, [snippet]);

  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-[7px] text-left transition-colors rounded-lg mx-1",
        focused
          ? "bg-gray-100/80 dark:bg-white/[0.06]"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
      )}
      style={{ width: "calc(100% - 8px)" }}
    >
      {/* Unread dot */}
      <div className="w-1.5 shrink-0 flex items-center justify-center">
        {isUnread
          ? <span className="block w-1.5 h-1.5 rounded-full bg-blue-500" />
          : <span className="block w-1.5 h-1.5" />
        }
      </div>

      {/* From */}
      <span className={cn(
        "text-[13px] shrink-0 w-[130px] truncate",
        isUnread
          ? "font-semibold text-gray-900 dark:text-white/[0.88]"
          : "text-gray-500 dark:text-white/[0.38]",
      )}>
        {from}
      </span>

      {/* Subject + snippet */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            "text-[13px] shrink-0 truncate max-w-[45%]",
            isUnread
              ? "text-gray-800 dark:text-white/[0.82]"
              : "text-gray-600 dark:text-white/[0.45]",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedSubject }}
        />
        {plainSnippet && (
          <>
            <span className="text-gray-200 dark:text-white/[0.1] text-[11px] shrink-0 select-none">—</span>
            <span className="text-[12.5px] text-gray-400 dark:text-white/[0.25] truncate">
              {plainSnippet}
            </span>
          </>
        )}
      </div>

      {/* Right meta */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
        {isStarred     && <Star      className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
        {hasAttachment && <Paperclip className="w-2.5 h-2.5 text-gray-300 dark:text-white/[0.2]" />}
        <span className="text-[11.5px] tabular-nums text-gray-400 dark:text-white/[0.25]">
          {formattedDate}
        </span>
      </div>
    </button>
  );
},
(prev, next) =>
  prev.focused       === next.focused   &&
  prev.isUnread      === next.isUnread  &&
  prev.subject       === next.subject   &&
  prev.from          === next.from      &&
  prev.snippet       === next.snippet   &&
  prev.date          === next.date      &&
  prev.isStarred     === next.isStarred &&
  prev.hasAttachment === next.hasAttachment,
);

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center px-6">
      <p className="text-[13px] text-gray-400 dark:text-white/[0.28]">
        No results for &ldquo;
        <span className="text-gray-600 dark:text-white/45">{query}</span>
        &rdquo;
      </p>
      <p className="text-[11.5px] text-gray-300 dark:text-white/[0.18]">
        Try{" "}
        <code className="bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md text-[11px] font-mono text-gray-500 dark:text-white/[0.32]">
          from:{query.split(" ")[0]}
        </code>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <span className="w-4 h-4 rounded-full border border-gray-200 border-t-gray-400 dark:border-white/[0.08] dark:border-t-white/30 animate-spin" />
    </div>
  );
}