"use client";

import { useRef, useEffect, useState } from "react";
import { Search, X, LayoutPanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchState } from "./useSearchState";
import { FilterChips } from "./FilterChips";
import { SectionHead, RecentRow, ThreadRow, EmptyState, Spinner } from "./ResultsList";
import { PreviewPane } from "./PreviewPane";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MailSearchCommand({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Track hovered thread for the "jump back in" preview
  // Reset happens inside onOpenChange callback — no useEffect needed
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);

  const s = useSearchState(open, onOpenChange);

  // Focus input on open — pure DOM side-effect, no setState
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Reset hovered thread when modal closes — piggybacked into s.close via wrapper
  const handleClose = () => {
    setHoveredThreadId(null);
    s.close();
  };

  // Global ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose(); else onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); s.navigate(1);  }
    if (e.key === "ArrowUp")   { e.preventDefault(); s.navigate(-1); }
    if (e.key === "Escape")    { handleClose(); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (s.focusedIdx >= 0 && s.results[s.focusedIdx]) {
        s.openThread(s.results[s.focusedIdx].threadId, s.input.trim());
      } else {
        // Commit both text AND any active filters — works even with empty input
        s.commitSearch(s.input.trim());
      }
    }
  };

  if (!open) return null;

  const previewEmail    = s.focusedEmail ?? null;
  const previewThreadId = !previewEmail ? hoveredThreadId : null;

  // Footer hint: if filters are active but no text, Enter still commits
  const enterLabel = s.hasInput ? "search" : (s.filterCount > 0 ? "apply filters" : "open");

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/[0.14] dark:bg-black/[0.45]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative flex flex-col bg-white dark:bg-[#191919] overflow-hidden",
          "rounded-xl border border-gray-200/80 dark:border-white/[0.06]",
          "shadow-[0_8px_40px_-4px_rgba(0,0,0,0.18),0_2px_12px_-2px_rgba(0,0,0,0.10)]",
          "dark:shadow-[0_8px_48px_-4px_rgba(0,0,0,0.6),0_2px_16px_-2px_rgba(0,0,0,0.4)]",
          "transition-[width] duration-150",
          s.showPreview ? "w-[880px]" : "w-[620px]",
        )}
        style={{ maxHeight: "68vh" }}
      >
        {/* ── Input row ── */}
        <div className="flex items-center gap-2.5 px-3.5 h-[46px] shrink-0">
          <Search className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
          <input
            ref={inputRef}
            value={s.input}
            onChange={(e) => s.setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search mail…  try "from:name" or "is:unread"'
            className="flex-1 text-[13.5px] bg-transparent outline-none text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20 caret-blue-500"
          />

          {s.isFetching && (
            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 border-t-gray-400 dark:border-white/10 dark:border-t-white/35 animate-spin shrink-0" />
          )}

          {s.input && (
            <button
              onMouseDown={(e) => { e.preventDefault(); s.setInput(""); }}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 hover:bg-gray-100 dark:hover:bg-white/6 transition-all shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            onMouseDown={(e) => { e.preventDefault(); s.setShowPreview(!s.showPreview); }}
            title="Toggle preview"
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center transition-all shrink-0",
              s.showPreview
                ? "bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900"
                : "text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-500 dark:hover:text-white/50",
            )}
          >
            <LayoutPanelLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.05] shrink-0" />

        {/* ── Filter chips ── */}
        <FilterChips filters={s.filters} onChange={s.setFilters} />

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          <div className="flex-1 overflow-y-auto py-1 min-w-0">

            {s.showResults ? (
              <>
                {s.isFetching && s.results.length === 0 ? (
                  <Spinner />
                ) : s.results.length > 0 ? (
                  <>
                    <SectionHead
                      label="Results"
                      meta={s.total > 8 ? `${s.total} found` : undefined}
                    />
                    {s.results.map((email, i) => (
                      <ThreadRow
                        key={email.id}
                        from={email.from.name || email.from.email}
                        subject={email.subject}
                        snippet={email.snippet}
                        date={email.receivedAt}
                        isUnread={!email.isRead}
                        hasAttachment={email.hasAttachments}
                        isStarred={email.isStarred}
                        focused={s.focusedIdx === i}
                        onHover={() => { s.setFocusedIdx(i); s.setFocusedEmail(email); }}
                        onClick={() => s.openThread(email.threadId, s.input.trim())}
                      />
                    ))}
                    {s.total > 8 && (
                      <button
                        onClick={() => s.commitSearch(s.input.trim())}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-400 dark:text-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors rounded-md mx-1 text-left"
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <kbd className="text-[10px] px-1 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-gray-400 dark:text-white/25">↵</kbd>
                        See all {s.total} results
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyState query={s.debounced} />
                )}
              </>
            ) : (
              <>
                {s.recentSearches.length > 0 && (
                  <>
                    <SectionHead label="Recent searches" />
                    {s.recentSearches.map((r) => (
                      <RecentRow
                        key={r.id}
                        text={r.searchText}
                        onClick={() => s.commitSearch(r.searchText)}
                      />
                    ))}
                  </>
                )}

                {s.recentThreads.length > 0 && (
                  <>
                    {s.recentSearches.length > 0 && (
                      <div className="h-px bg-gray-100 dark:bg-white/[0.05] my-1 mx-3" />
                    )}
                    <SectionHead label="Jump back in" />
                    {s.recentThreads.map((t) => (
                      <ThreadRow
                        key={t.threadId}
                        from={t.from.name || t.from.email}
                        subject={t.subject}
                        date={t.receivedAt}
                        isUnread={t.isUnread}
                        focused={false}
                        onHover={() => setHoveredThreadId(t.threadId)}
                        onClick={() => s.openThread(t.threadId)}
                      />
                    ))}
                  </>
                )}

                {s.recentSearches.length === 0 && s.recentThreads.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 py-14 text-center">
                    <Search className="w-8 h-8 text-gray-100 dark:text-white/8 mb-1" />
                    <p className="text-[13px] font-medium text-gray-400 dark:text-white/28">Search your mail</p>
                    <p className="text-[11.5px] text-gray-300 dark:text-white/18">
                      Try &ldquo;from:name&rdquo; · &ldquo;is:unread&rdquo; · &ldquo;has:attachment&rdquo;
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {s.showPreview && (
            <div className="w-[250px] shrink-0 border-l border-gray-100 dark:border-white/[0.05] overflow-hidden">
              <PreviewPane email={previewEmail} threadId={previewThreadId} />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-gray-100 dark:border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            {[
              { key: "↵",     label: enterLabel },
              { key: "↑↓",    label: "navigate" },
              { key: "click", label: "open"     },
              { key: "esc",   label: "close"    },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1 text-[11px] text-gray-300 dark:text-white/20 select-none">
                <kbd className="px-1.5 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-[10px] text-gray-400 dark:text-white/28">{key}</kbd>
                {label}
              </span>
            ))}
          </div>
          <span className="text-[10.5px] text-gray-300 dark:text-white/18 font-mono select-none">⌘K</span>
        </div>
      </div>
    </div>
  );
}