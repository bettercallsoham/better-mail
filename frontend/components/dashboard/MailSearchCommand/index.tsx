"use client";

import { useRef, useEffect, useCallback, memo } from "react";
import { Search, X, LayoutPanelLeft, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchState } from "./useSearchState";
import { SectionHead, RecentRow, ThreadRow, EmptyState, Spinner } from "./ResultsList";
import { PreviewPane } from "./PreviewPane";
import { FilterChips } from "./FilterChips";
import { Kbd } from "@/components/ui/kbd";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level constants — never re-created
// ─────────────────────────────────────────────────────────────────────────────

/** Stable footer hints — no need to allocate a new array every render */
const BASE_HINTS = [
  { key: "↑↓",  label: "navigate" },
  { key: "esc", label: "close"    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/** Inline contact avatar — deterministic hue from email address */
const InlineAvatar = memo(function InlineAvatar({
  name,
  email,
}: {
  name?: string;
  email: string;
}) {
  const hue = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold"
      style={{ background: `hsl(${hue} 45% 45%)` }}
    >
      {(name || email)[0].toUpperCase()}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function MailSearchCommand({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const s = useSearchState(open, onOpenChange);
  const { close } = s;

  // ── Focus input on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  // ── Stable close handler ───────────────────────────────────────────────────
  const handleClose = useCallback(() => close(), [close]);

  // ── Global ⌘K toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose(); else onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange, handleClose]);

  // ── Keyboard navigation inside the command palette ────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          s.navigate(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          s.navigate(-1);
          break;
        case "Escape":
          handleClose();
          break;
        case "Enter": {
          e.preventDefault();
          if (s.inProgress && s.focusedIdx >= 0 && s.inlineSuggestions[s.focusedIdx]) {
            s.commitInlineSuggestion(s.inlineSuggestions[s.focusedIdx].email);
          } else if (s.focusedIdx >= 0 && s.results[s.focusedIdx]) {
            s.openThread(s.results[s.focusedIdx].threadId, s.input.trim());
          } else {
            s.commitSearch(s.input.trim());
          }
          break;
        }
        case "Tab":
          if (s.inProgress && s.inlineSuggestions.length > 0) {
            e.preventDefault();
            s.commitInlineSuggestion(s.inlineSuggestions[0].email);
          }
          break;
      }
    },
    [s, handleClose],
  );

  if (!open) return null;

  // Derived preview targets — stable per render, not expensive
  const previewEmail    = s.focusedEmail ?? null;
  const previewThreadId = previewEmail ? null : s.hoveredThreadId;

  // Dynamic footer hints depend on current state
  const enterLabel =
    s.inProgress     ? "pick contact"
    : s.hasInput     ? "search"
    : s.filterCount > 0 ? "apply filters"
    : "open";

  const hints = [
    { key: "↵",   label: enterLabel },
    { key: "tab", label: s.inProgress ? "complete" : "navigate" },
    ...BASE_HINTS,
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/[0.14] dark:bg-black/[0.45]"
        onClick={handleClose}
      />

      {/* Panel — full width on mobile, fixed width on desktop */}
      <div
        className={cn(
          "relative flex flex-col bg-white dark:bg-[#191919] overflow-hidden w-full",
          "rounded-xl border border-gray-200/80 dark:border-white/[0.06]",
          "shadow-[0_8px_40px_-4px_rgba(0,0,0,0.18),0_2px_12px_-2px_rgba(0,0,0,0.10)]",
          "dark:shadow-[0_8px_48px_-4px_rgba(0,0,0,0.6),0_2px_16px_-2px_rgba(0,0,0,0.4)]",
          "transition-[width] duration-150",
          // On lg+ respect the preview toggle; on smaller screens always narrow
          "lg:w-auto",
          s.showPreview ? "lg:max-w-[880px]" : "lg:max-w-[620px]",
          "sm:max-w-[620px]",
          "max-h-[85vh] sm:max-h-[72vh]",
        )}
      >
        {/* ── Input row ── */}
        <div className="flex items-center gap-2.5 px-3.5 h-[46px] shrink-0">
          <Search className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />

          <input
            ref={inputRef}
            value={s.input}
            onChange={(e) => s.setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search mail… try "from:name" or "is:unread"'
            className="flex-1 text-[13.5px] bg-transparent outline-none text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20 caret-blue-500"
          />

          {/* Spinner — only when actively fetching (not during inline suggestions) */}
          {s.isFetching && !s.inProgress && (
            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 border-t-gray-400 dark:border-white/10 dark:border-t-white/35 animate-spin shrink-0" />
          )}

          {/* Clear button */}
          {s.input && (
            <button
              onMouseDown={(e) => { e.preventDefault(); s.setInput(""); }}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 hover:bg-gray-100 dark:hover:bg-white/6 transition-all shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Preview toggle — hidden on < lg since preview is always hidden there */}
          <button
            onMouseDown={(e) => { e.preventDefault(); s.setShowPreview(!s.showPreview); }}
            title="Toggle preview"
            className={cn(
              "hidden lg:flex w-6 h-6 rounded items-center justify-center transition-all shrink-0",
              s.showPreview
                ? "bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900"
                : "text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-500 dark:hover:text-white/50",
            )}
          >
            <LayoutPanelLeft className="w-3 h-3" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/[0.05] shrink-0" />

        {/* ── Filter chips — horizontally scrollable, fine on mobile ── */}
        <FilterChips filters={s.filters} onChange={s.setFilters} />

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-1 min-w-0">

            {/* INLINE FROM:/TO: SUGGESTIONS */}
            {s.inProgress ? (
              <>
                <SectionHead
                  label={`${s.inProgress.prefix === "from" ? "From" : "To"}: suggestions`}
                  meta={s.inProgress.partial ? `"${s.inProgress.partial}"` : undefined}
                />

                {s.inlineSuggestions.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                    <AtSign className="w-6 h-6 text-gray-200 dark:text-white/10 mb-1" />
                    <p className="text-[12.5px] text-gray-400 dark:text-white/28">
                      {s.inProgress.partial
                        ? `No contacts matching "${s.inProgress.partial}"`
                        : "Keep typing to search contacts"}
                    </p>
                    <p className="text-[11px] text-gray-300 dark:text-white/18">
                      Or press{" "}
                      <Kbd className="px-1 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-[10px]">
                        ↵
                      </Kbd>{" "}
                      to search anyway
                    </p>
                  </div>
                ) : (
                  s.inlineSuggestions.map((sg, i) => (
                    <button
                      key={sg.email}
                      onMouseEnter={() => s.setFocusedIdx(i)}
                      onClick={() => s.commitInlineSuggestion(sg.email)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-md mx-1",
                        s.focusedIdx === i
                          ? "bg-gray-100/80 dark:bg-white/[0.06]"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                      )}
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <InlineAvatar name={sg.name} email={sg.email} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-gray-800 dark:text-white/85 truncate leading-tight">
                          {sg.name || sg.email}
                        </span>
                        {sg.name && (
                          <span className="text-[11px] text-gray-400 dark:text-white/30 truncate">
                            {sg.email}
                          </span>
                        )}
                      </div>
                      {i === 0 && (
                        <Kbd className="shrink-0 px-1.5 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-[10px] text-gray-400 dark:text-white/25">
                          tab
                        </Kbd>
                      )}
                    </button>
                  ))
                )}
              </>

            ) : s.showResults ? (
              /* SEARCH RESULTS */
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
                        onHover={() => s.setFocusedIdx(i)}
                        onClick={() => s.openThread(email.threadId, s.input.trim())}
                      />
                    ))}
                    {s.total > 8 && (
                      <button
                        onClick={() => s.commitSearch(s.input.trim())}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-400 dark:text-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors rounded-md mx-1 text-left"
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <Kbd className="text-[10px] px-1 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-gray-400 dark:text-white/25">
                          ↵
                        </Kbd>
                        See all {s.total} results
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyState query={s.debounced} />
                )}
              </>

            ) : (
              /* EMPTY / RECENT STATE */
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
                        onHover={() => s.setHoveredThreadId(t.threadId)}
                        onClick={() => s.openThread(t.threadId)}
                      />
                    ))}
                  </>
                )}

                {s.recentSearches.length === 0 && s.recentThreads.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 py-14 text-center">
                    <Search className="w-8 h-8 text-gray-100 dark:text-white/8 mb-1" />
                    <p className="text-[13px] font-medium text-gray-400 dark:text-white/28">
                      Search your mail
                    </p>
                    <p className="text-[11.5px] text-gray-300 dark:text-white/18">
                      Try &ldquo;from:name&rdquo; · &ldquo;is:unread&rdquo; · &ldquo;has:attachment&rdquo;
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview pane — hidden on < lg screens */}
          {s.showPreview && (
            <div className="hidden lg:block w-[250px] shrink-0 border-l border-gray-100 dark:border-white/[0.05] overflow-hidden">
              <PreviewPane email={previewEmail} threadId={previewThreadId} />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-gray-100 dark:border-white/[0.05] shrink-0">
          {/* Keyboard hints — hidden on mobile to save space */}
          <div className="hidden sm:flex items-center gap-3">
            {hints.map(({ key, label }) => (
              <span
                key={key}
                className="flex items-center gap-1 text-[11px] text-gray-300 dark:text-white/20 select-none"
              >
                <Kbd className="px-1.5 py-px rounded bg-gray-100 dark:bg-white/6 font-mono text-[10px] text-gray-400 dark:text-white/28">
                  {key}
                </Kbd>
                {label}
              </span>
            ))}
          </div>
          {/* On mobile show a minimal tap hint instead */}
          <p className="sm:hidden text-[11px] text-gray-300 dark:text-white/20 select-none">
            Tap a result to open
          </p>
          <span className="text-[10.5px] text-gray-300 dark:text-white/18 font-mono select-none">
            ⌘K
          </span>
        </div>
      </div>
    </div>
  );
}