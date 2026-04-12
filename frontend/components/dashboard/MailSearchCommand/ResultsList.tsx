"use client";

import { memo, useMemo } from "react";
import { Clock, Bookmark, BookmarkCheck, Star, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateSavedSearch } from "@/features/mailbox/mailbox.query";

// ─── Utils ────────────────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffHr < 48) return "Yesterday";
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

export function stripMark(html: string | undefined | null): string {
  return html?.replace(/<\/?mark[^>]*>/g, "") ?? "";
}

export function applyHighlight(html: string | undefined | null): string {
  return (html ?? "").replace(
    /<mark>(.*?)<\/mark>/g,
    '<mark class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-[2px] px-px not-italic font-medium">$1</mark>',
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

export function SectionHead({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
      <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase select-none text-gray-400 dark:text-white/30">
        {label}
      </span>
      {meta && (
        <span className="text-[11px] tabular-nums text-gray-400 dark:text-white/25">{meta}</span>
      )}
    </div>
  );
}

// ─── Save button ──────────────────────────────────────────────────────────────

const SaveBtn = memo(function SaveBtn({ text }: { text: string }) {
  const create = useCreateSavedSearch();

  if (create.isSuccess)
    return <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        create.mutate({ name: text, query: { searchText: text, filters: {} } });
      }}
      className="opacity-0 group-hover/row:opacity-100 shrink-0 p-1 rounded-md transition-all text-gray-400 dark:text-white/20 hover:text-gray-700 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/8"
    >
      <Bookmark className="w-3.5 h-3.5" />
    </div>
  );
});

// ─── Recent row ───────────────────────────────────────────────────────────────

export const RecentRow = memo(function RecentRow({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group/row w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg mx-1 transition-colors hover:bg-gray-50 dark:hover:bg-white/4"
      style={{ width: "calc(100% - 8px)" }}
    >
      <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-white/20 shrink-0" />
      <span className="flex-1 text-[13px] text-gray-600 dark:text-white/45 truncate">{text}</span>
      <SaveBtn text={text} />
    </button>
  );
});

// ─── Thread row ───────────────────────────────────────────────────────────────
// Single-line: sender (fixed width) → subject → snippet — date

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

export const ThreadRow = memo(
  function ThreadRow({ from, subject, snippet, date, isUnread, hasAttachment, isStarred, focused, onHover, onClick }: ThreadRowProps) {
    const highlightedSubject = useMemo(() => applyHighlight(subject), [subject]);
    const plainSnippet = useMemo(() => (snippet ? stripMark(snippet).slice(0, 80) : null), [snippet]);

    return (
      <button
        onMouseEnter={onHover}
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 h-[40px] text-left rounded-lg mx-1 transition-colors",
          focused
            ? "bg-black/[0.05] dark:bg-white/[0.055]"
            : "hover:bg-black/[0.02] dark:hover:bg-white/4",
        )}
        style={{ width: "calc(100% - 8px)" }}
      >
        {/* Unread dot */}
        <div className="w-2 shrink-0 flex justify-center">
          {isUnread && <span className="block w-[5px] h-[5px] rounded-full bg-blue-500" />}
        </div>

        {/* Sender — fixed width */}
        <span
          className={cn(
            "shrink-0 w-36 truncate text-[13px]",
            isUnread
              ? "font-semibold text-gray-900 dark:text-white/88"
              : "font-medium text-gray-500 dark:text-white/50",
          )}
        >
          {from}
        </span>

        {/* Subject */}
        <span
          className={cn(
            "shrink-0 truncate text-[13px] max-w-[35%]",
            isUnread ? "text-gray-800 dark:text-white/75" : "text-gray-500 dark:text-white/45",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedSubject }}
        />

        {/* Snippet */}
        {plainSnippet && (
          <>
            <span className="text-gray-200 dark:text-white/10 text-[11px] shrink-0 select-none">—</span>
            <span className="flex-1 text-[12px] text-gray-400 dark:text-white/28 truncate">{plainSnippet}</span>
          </>
        )}
        {!plainSnippet && <div className="flex-1" />}

        {/* Meta */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2">
          {isStarred && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
          {hasAttachment && <Paperclip className="w-2.5 h-2.5 text-gray-300 dark:text-white/20" />}
          <span className="text-[11px] tabular-nums text-gray-400 dark:text-white/30 whitespace-nowrap">
            {fmtDate(date)}
          </span>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.focused === next.focused &&
    prev.isUnread === next.isUnread &&
    prev.subject === next.subject &&
    prev.from === next.from &&
    prev.snippet === next.snippet &&
    prev.date === next.date &&
    prev.isStarred === next.isStarred &&
    prev.hasAttachment === next.hasAttachment,
);

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
      <p className="text-[13px] text-gray-500 dark:text-white/35">
        No results for{" "}
        <span className="font-medium text-gray-700 dark:text-white/50">"{query}"</span>
      </p>
      <p className="text-[12px] text-gray-400 dark:text-white/28">
        Try{" "}
        <code className="bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded text-[11px] font-mono text-gray-600 dark:text-white/40">
          from:{query.split(" ")[0]}
        </code>
      </p>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-white/8 border-t-gray-400 dark:border-t-white/30 animate-spin" />
    </div>
  );
}