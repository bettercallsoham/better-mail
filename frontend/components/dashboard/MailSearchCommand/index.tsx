"use client";

import { useRef, useEffect, useCallback, memo, Suspense } from "react";
import { Search, X, LayoutPanelLeft, AtSign, Bookmark, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchState, SHORTCUT_MAP } from "./useSearchState";
import { SectionHead, RecentRow, ThreadRow, EmptyState, Spinner } from "./ResultsList";
import { PreviewPane } from "./PreviewPane";
import { FilterChips, type FilterChipsHandle } from "./FilterChips";
import { Kbd } from "@/components/ui/kbd";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BASE_HINTS = [
  { key: "↑↓",  label: "navigate" },
  { key: "esc", label: "close"    },
] as const;

const BODY_HEIGHT = 380;

// ─────────────────────────────────────────────────────────────────────────────
// Saved search row
// ─────────────────────────────────────────────────────────────────────────────

const SavedSearchRow = memo(function SavedSearchRow({
  saved,
  focused,
  onHover,
  onClick,
}: {
  saved: SavedSearch;
  focused: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const hasFilters = Object.values(saved.query.filters ?? {}).some(Boolean);
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-[7px] text-left rounded-lg mx-1 transition-colors",
        focused ? "bg-gray-100/80 dark:bg-white/[0.06]" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
      )}
      style={{ width: "calc(100% - 8px)" }}
    >
      {/* Color dot or pin icon */}
      {saved.isPinned ? (
        <Pin className="w-3 h-3 text-gray-400 dark:text-white/[0.28] shrink-0" />
      ) : saved.color ? (
        <span className="w-2 h-2 rounded-full shrink-0 mt-px" style={{ background: saved.color }} />
      ) : (
        <Bookmark className="w-3 h-3 text-gray-300 dark:text-white/[0.18] shrink-0" />
      )}

      {/* Name */}
      <span className="flex-1 text-[13px] text-gray-600 dark:text-white/[0.55] truncate">{saved.name}</span>

      {/* Usage count — subtle social proof */}
      {saved.usageCount > 1 && (
        <span className="text-[10.5px] tabular-nums text-gray-300 dark:text-white/[0.18] shrink-0">
          {saved.usageCount}×
        </span>
      )}

      {/* Filter indicator dot */}
      {hasFilters && (
        <span className="w-1 h-1 rounded-full bg-blue-400/50 shrink-0" />
      )}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Inline avatar
// ─────────────────────────────────────────────────────────────────────────────

const InlineAvatar = memo(function InlineAvatar({ name, email }: { name?: string; email: string }) {
  const hue = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold" style={{ background: `hsl(${hue} 45% 45%)` }}>
      {(name || email)[0].toUpperCase()}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function MailSearchCommand({ open, onOpenChange }: Props) {
  const inputRef      = useRef<HTMLInputElement>(null);
  const filterChipRef = useRef<FilterChipsHandle>(null);
  const s = useSearchState(open, onOpenChange);
  const { close } = s;

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  const handleClose = useCallback(() => close(), [close]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) handleClose(); else onOpenChange(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onOpenChange, handleClose]);

  // ── Keyboard handler ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const chips = filterChipRef.current;

      switch (e.key) {

        // ── Escape always closes ──────────────────────────────────────────
        case "Escape":
          handleClose();
          return;

        // ── Arrow keys: chip option nav first, then result list ───────────
        case "ArrowDown":
        case "ArrowUp": {
          if (chips?.handleChipKeyDown(e.key)) { e.preventDefault(); return; }
          e.preventDefault();
          s.navigate(e.key === "ArrowDown" ? 1 : -1);
          return;
        }

        // ── Space: expand single-letter shortcut when input is exactly it ─
        case " ": {
          const sc = SHORTCUT_MAP[s.input.trim()];
          if (sc && s.input.trim().length === s.input.length) {
            e.preventDefault();
            s.setInput(sc.expansion);
            return;
          }
          break;
        }

        // ── Enter: chip option → inline suggestion → result → search ──────
        case "Enter": {
          if (chips?.handleChipKeyDown("Enter")) { e.preventDefault(); return; }
          e.preventDefault();
          if (s.inProgress && s.focusedIdx >= 0 && s.inlineSuggestions[s.focusedIdx]) {
            s.commitInlineSuggestion(s.inlineSuggestions[s.focusedIdx].email);
          } else if (s.focusedIdx >= 0 && s.results[s.focusedIdx]) {
            s.openThread(s.results[s.focusedIdx].threadId, s.input.trim());
          } else {
            s.commitSearch(s.input.trim());
          }
          return;
        }

        // ── Tab: complete inline suggestion OR cycle through filter chips ──
        case "Tab": {
          e.preventDefault();
          // If inline suggestion is active, Tab completes it
          if (s.inProgress && s.inlineSuggestions.length > 0) {
            s.commitInlineSuggestion(s.inlineSuggestions[0].email);
            return;
          }
          // Otherwise forward to chip cycling (Tab moves forward, Shift+Tab back)
          const stillOnChip = filterChipRef.current?.cycleChip(e.shiftKey) ?? false;
          if (!stillOnChip) {
            filterChipRef.current?.blurChips();
            inputRef.current?.focus();
          }
          return;
        }

        // ── Single-letter status shortcuts — forward to chip if any open ──
        default: {
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            if (chips?.handleChipKeyDown(e.key)) { e.preventDefault(); return; }
          }
        }
      }
    },
    [s, handleClose],
  );

  const handleChipEscape = useCallback(() => {
    filterChipRef.current?.blurChips();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  if (!open) return null;

  const previewEmail    = s.focusedEmail ?? null;
  const previewThreadId = previewEmail ? null : s.hoveredThreadId;
  const filtersActive   = s.filterCount > 0;

  const enterLabel =
    s.inProgress        ? "pick contact"
    : s.hasInput        ? "search"
    : s.filterCount > 0 ? "apply"
    : "open";

  const hints = [
    { key: "↵",   label: enterLabel },
    { key: "tab", label: s.inProgress ? "complete" : "filters" },
    ...BASE_HINTS,
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-0">
      <div className="absolute inset-0 bg-black/[0.12] dark:bg-black/[0.55]" onClick={handleClose} />

      <div
        style={{ width: s.showPreview ? 880 : 620 }}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl",
          "bg-white border border-gray-200/70",
          "shadow-[0_8px_40px_-4px_rgba(0,0,0,0.15),0_2px_12px_-2px_rgba(0,0,0,0.08)]",
          "dark:bg-[#1f1f1f] dark:border-white/[0.07]",
          "dark:shadow-[0_24px_72px_-8px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.04)]",
          filtersActive && "ring-1 ring-blue-500/20 dark:ring-blue-400/[0.12]",
          "transition-all duration-200 max-w-[95vw]",
        )}
      >

        {/* ── Input row ── */}
        <div className="flex items-center gap-2.5 px-3.5 h-[48px] shrink-0 border-b border-gray-100 dark:border-white/[0.05]">
          <Search className="w-4 h-4 text-gray-300 dark:text-white/[0.22] shrink-0" />

          {/* Ghost text overlay — invisible span reserves input-text width, ghost follows */}
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              value={s.input}
              onChange={(e) => s.setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={s.input ? "" : 'Search mail… type u, s, f, a, e or "from:name"'}
              className="w-full relative z-10 bg-transparent text-[13.5px] outline-none text-gray-800 dark:text-white/[0.82] placeholder:text-gray-300 dark:placeholder:text-white/[0.2] caret-blue-500"
            />

            {/* Ghost text: rendered as invisible-prefix + dim suffix */}
            {s.ghostSuffix && (
              <span
                aria-hidden
                className="absolute inset-0 flex items-center pointer-events-none whitespace-pre text-[13.5px] overflow-hidden"
              >
                {/* Push ghost right by the same amount the input text occupies */}
                <span className="invisible">{s.input}</span>
                <span className="text-gray-300 dark:text-white/[0.22]">{s.ghostSuffix}</span>
              </span>
            )}
          </div>

          {/* Live result count */}
          {s.total > 0 && s.hasInput && !s.isFetching && (
            <span className="shrink-0 text-[11px] tabular-nums text-gray-400 dark:text-white/[0.25] select-none">
              {s.total > 999 ? "999+" : s.total}
            </span>
          )}

          {s.isFetching && !s.inProgress && (
            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 border-t-gray-400 dark:border-white/[0.08] dark:border-t-white/30 animate-spin shrink-0" />
          )}

          {s.input && (
            <button
              onMouseDown={(e) => { e.preventDefault(); s.setInput(""); }}
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 text-gray-300 dark:text-white/[0.2] hover:text-gray-500 dark:hover:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            onMouseDown={(e) => { e.preventDefault(); s.setShowPreview(!s.showPreview); }}
            title="Toggle preview"
            className={cn(
              "hidden lg:flex w-6 h-6 rounded-md items-center justify-center transition-all shrink-0",
              s.showPreview
                ? "bg-gray-900 dark:bg-white/[0.88] text-white dark:text-gray-900"
                : "text-gray-300 dark:text-white/[0.2] hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-500 dark:hover:text-white/50",
            )}
          >
            <LayoutPanelLeft className="w-3 h-3" />
          </button>
        </div>

        {/* ── Filter chips ── */}
        <FilterChips
          ref={filterChipRef}
          filters={s.filters}
          onChange={s.setFilters}
          onChipEscape={handleChipEscape}
        />

        {/* ── Body — fixed height, no size jumping ── */}
        <div className="flex overflow-hidden" style={{ height: BODY_HEIGHT }}>
          <div className="flex-1 overflow-y-auto py-1 min-w-0">

            {/* ── INLINE SUGGESTIONS ── */}
            {s.inProgress ? (
              <>
                <SectionHead
                  label={`${s.inProgress.prefix === "from" ? "From" : "To"}: suggestions`}
                  meta={s.inProgress.partial ? `"${s.inProgress.partial}"` : undefined}
                />
                {s.inlineSuggestions.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                    <AtSign className="w-6 h-6 text-gray-200 dark:text-white/[0.08] mb-1" />
                    <p className="text-[12.5px] text-gray-400 dark:text-white/[0.28]">
                      {s.inProgress.partial ? `No contacts matching "${s.inProgress.partial}"` : "Keep typing to search contacts"}
                    </p>
                  </div>
                ) : (
                  s.inlineSuggestions.map((sg, i) => (
                    <button
                      key={sg.email}
                      onMouseEnter={() => s.setFocusedIdx(i)}
                      onClick={() => s.commitInlineSuggestion(sg.email)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-lg mx-1",
                        s.focusedIdx === i ? "bg-gray-100/80 dark:bg-white/[0.06]" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
                      )}
                      style={{ width: "calc(100% - 8px)" }}
                    >
                      <InlineAvatar name={sg.name} email={sg.email} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-gray-800 dark:text-white/[0.82] truncate leading-tight">{sg.name || sg.email}</span>
                        {sg.name && <span className="text-[11px] text-gray-400 dark:text-white/[0.28] truncate">{sg.email}</span>}
                      </div>
                      {i === 0 && (
                        <Kbd className="shrink-0 px-1.5 py-px rounded-md bg-gray-100 dark:bg-white/[0.06] font-mono text-[10px] text-gray-400 dark:text-white/[0.25]">tab</Kbd>
                      )}
                    </button>
                  ))
                )}
              </>

            ) : s.showResults ? (
              /* ── SEARCH RESULTS ── */
              <>
                {s.isFetching && s.results.length === 0 ? (
                  <Spinner />
                ) : s.results.length > 0 ? (
                  <>
                    <SectionHead label="Results" meta={s.total > 8 ? `${s.total} found` : undefined} />
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors rounded-lg mx-1 text-left text-gray-400 dark:text-white/[0.28] hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        <Kbd className="text-[10px] px-1 py-px rounded-md bg-gray-100 dark:bg-white/[0.06] font-mono text-gray-400 dark:text-white/[0.25]">↵</Kbd>
                        See all {s.total} results
                      </button>
                    )}
                  </>
                ) : (
                  <EmptyState query={s.debounced} />
                )}
              </>

            ) : (
              /* ── EMPTY STATE: recent + saved + jump back in ── */
              <>
                {/* Recent searches */}
                {s.recentSearches.length > 0 && (
                  <>
                    <SectionHead label="Recent" />
                    {s.recentSearches.map((r) => (
                      <RecentRow key={r.id} text={r.searchText} onClick={() => s.commitSearch(r.searchText)} />
                    ))}
                  </>
                )}

                {/* Saved searches — pinned first, then by usage */}
                {s.savedSearches.length > 0 && (
                  <>
                    {s.recentSearches.length > 0 && <div className="h-px bg-gray-100 dark:bg-white/[0.05] my-1 mx-3" />}
                    <SectionHead label="Saved" />
                    {s.savedSearches.map((saved, i) => (
                      <SavedSearchRow
                        key={saved.id}
                        saved={saved}
                        focused={false}
                        onHover={() => {}}
                        onClick={() => s.commitSavedSearch(saved)}
                      />
                    ))}
                  </>
                )}

                {/* Jump back in */}
                {s.recentThreads.length > 0 && (
                  <>
                    {(s.recentSearches.length > 0 || s.savedSearches.length > 0) && (
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

                {/* True empty state */}
                {s.recentSearches.length === 0 && s.savedSearches.length === 0 && s.recentThreads.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 py-14 text-center">
                    <Search className="w-8 h-8 text-gray-100 dark:text-white/[0.07] mb-1" />
                    <p className="text-[13px] font-medium text-gray-400 dark:text-white/[0.28]">Search your mail</p>
                    <p className="text-[11.5px] text-gray-300 dark:text-white/[0.18]">
                      Try{" "}
                      <code className="bg-gray-100 dark:bg-white/[0.06] px-1 rounded text-[11px] font-mono">u</code>
                      {" "}·{" "}
                      <code className="bg-gray-100 dark:bg-white/[0.06] px-1 rounded text-[11px] font-mono">s</code>
                      {" "}·{" "}
                      <code className="bg-gray-100 dark:bg-white/[0.06] px-1 rounded text-[11px] font-mono">f</code>
                      {" "}for shortcuts
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview pane */}
          {s.showPreview && (
            <div className="hidden lg:block w-[250px] shrink-0 border-l border-gray-100 dark:border-white/[0.05] overflow-hidden">
              <PreviewPane email={previewEmail} threadId={previewThreadId} />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-gray-100 dark:border-white/[0.05] shrink-0">
          <div className="hidden sm:flex items-center gap-3">
            {hints.map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1 text-[11px] text-gray-300 dark:text-white/[0.2] select-none">
                <Kbd className="px-1.5 py-px rounded-md bg-gray-100 dark:bg-white/[0.05] font-mono text-[10px] text-gray-400 dark:text-white/[0.28]">{key}</Kbd>
                {label}
              </span>
            ))}
          </div>
          <p className="sm:hidden text-[11px] text-gray-300 dark:text-white/[0.2] select-none">Tap a result to open</p>
          <span className="text-[10.5px] text-gray-300 dark:text-white/[0.18] font-mono select-none">⌘K</span>
        </div>
      </div>
    </div>
  );
}