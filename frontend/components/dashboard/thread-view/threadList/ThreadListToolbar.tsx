"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import { mailboxKeys, useDeleteSavedSearch } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import { cn } from "@/lib/utils";
import {
  Search, X, BookmarkCheck, Bell, Tag,
  UserRound, TriangleAlert, SlidersHorizontal,
  // REMOVED: Zap — was beside "Primary" label, added playful/Slack energy, not premium
} from "lucide-react";
import { MailSearchCommand } from "../../MailSearchCommand";
import type { SearchFilters } from "@/lib/store/ui.store";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_DISPLAY: Record<string, string> = {
  CATEGORY_PERSONAL:   "Personal",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_UPDATES:    "Updates",
  CATEGORY_SOCIAL:     "Social",
  CATEGORY_FORUMS:     "Forums",
};

const FOLDER_ICON: Record<string, React.ReactNode> = {
  "label:CATEGORY_PROMOTIONS": <Tag           className="w-3.5 h-3.5" />,
  "label:CATEGORY_SOCIAL":     <UserRound     className="w-3.5 h-3.5" />,
  "label:CATEGORY_UPDATES":    <Bell          className="w-3.5 h-3.5" />,
  "label:CATEGORY_FORUMS":     <TriangleAlert className="w-3.5 h-3.5" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function summariseFilters(q: string | null, f: SearchFilters | null): string {
  const parts: string[] = [];
  if (q?.trim())               parts.push(`"${q.trim()}"`);
  if (f?.isRead === false)     parts.push("Unread");
  if (f?.isRead === true)      parts.push("Read");
  if (f?.isStarred)            parts.push("Starred");
  if (f?.hasAttachments)       parts.push("Attachment");
  if (f?.isArchived)           parts.push("Archived");
  if (f?.filterFrom)           parts.push(`from:${f.filterFrom}`);
  if (f?.filterTo)             parts.push(`to:${f.filterTo}`);
  if (f?.labels)               parts.push(f.labels.replace(/^CATEGORY_/, "").toLowerCase());
  if (f?.dateFrom)             parts.push(`after:${f.dateFrom}`);
  return parts.join("  ·  ") || "Filtered";
}

function buildFilterTokens(q: string | null, f: SearchFilters | null): string[] {
  const t: string[] = [];
  if (q?.trim())               t.push(q.trim());
  if (f?.isRead === false)     t.push("unread");
  if (f?.isRead === true)      t.push("read");
  if (f?.isStarred)            t.push("starred");
  if (f?.hasAttachments)       t.push("attachment");
  if (f?.isArchived)           t.push("archived");
  if (f?.filterFrom)           t.push(`from:${f.filterFrom}`);
  if (f?.filterTo)             t.push(`to:${f.filterTo}`);
  if (f?.labels)               t.push(f.labels.replace(/^CATEGORY_/, "").toLowerCase());
  if (f?.dateFrom)             t.push(`after:${f.dateFrom}`);
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared data hook
// ─────────────────────────────────────────────────────────────────────────────

function useToolbarData() {
  const activeFolder    = useUIStore((s) => s.activeFolder);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const selectedEmail   = useUIStore((s) => s.selectedEmailAddress);
  const searchQuery     = useUIStore((s) => s.searchQuery);
  const searchFilters   = useUIStore((s) => s.searchFilters);
  const clearSearch     = useUIStore((s) => s.clearSearch);
  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);

  const { data: foldersData } = useQuery({
    queryKey: mailboxKeys.folders(selectedEmail ?? undefined),
    queryFn:  () => mailboxService.getFolders(selectedEmail ?? undefined),
    staleTime: 60_000,
    gcTime:    5 * 60_000,
  });

  const { data: savedSearches } = useQuery({
    queryKey: mailboxKeys.savedSearches(),
    queryFn:  mailboxService.getSavedSearches,
    staleTime: 60_000,
    select:   (d) => d.data,
  });

  const deleteSavedSearch = useDeleteSavedSearch();

  const categoryLabels = useMemo(
    () =>
      foldersData?.data?.labels
        ?.filter((l) => LABEL_DISPLAY[l.label])
        .map((l) => ({ id: `label:${l.label}`, label: LABEL_DISPLAY[l.label], raw: l.label })) ?? [],
    [foldersData],
  );

  const hasSearch  = !!(searchQuery || searchFilters);
  const activeDesc = hasSearch ? summariseFilters(searchQuery, searchFilters) : null;

  return {
    activeFolder, setActiveFolder,
    searchQuery, searchFilters,
    clearSearch, setSearchQuery,
    categoryLabels, savedSearches, deleteSavedSearch,
    hasSearch, activeDesc,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export function ThreadListToolbar() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (layoutMode === "zen") return null;

  return (
    <>
      <MailSearchCommand open={cmdOpen} onOpenChange={setCmdOpen} />
      {layoutMode === "flow"
        ? <FlowToolbar    onOpenSearch={() => setCmdOpen(true)} />
        : <VelocityToolbar onOpenSearch={() => setCmdOpen(true)} />
      }
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOW TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────

function FlowToolbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const {
    activeFolder, setActiveFolder,
    searchQuery, clearSearch, setSearchQuery,
    categoryLabels, savedSearches, deleteSavedSearch,
    hasSearch, activeDesc,
  } = useToolbarData();

  return (
    <div className="shrink-0 flex flex-col select-none">

      {/* Row 1 — Search */}
      <div className="flex items-center gap-2 px-4 h-[42px]">
        <button
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2.5 text-left group min-w-0"
        >
          <Search className="w-3.5 h-3.5 text-gray-300 dark:text-white/20 shrink-0 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors" />
          {hasSearch ? (
            <span className="flex-1 text-[13px] font-medium text-gray-700 dark:text-white/70 truncate">
              {activeDesc}
            </span>
          ) : (
            <span className="flex-1 text-[13px] text-gray-300 dark:text-white/20">
              Search
            </span>
          )}
          <kbd className="shrink-0 text-[10px] font-mono text-gray-300 dark:text-white/18 tracking-tight">
            ⌘K
          </kbd>
        </button>

        {hasSearch && (
          <button
            onClick={clearSearch}
            className="w-5 h-5 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row 2 — Folder tabs */}
      {/* UPDATED: Removed <Zap> icon from Primary button — cleaner, more authoritative */}
      <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">

        {/* Primary — solid filled pill, no icon */}
        <button
          onClick={() => { setActiveFolder("inbox"); clearSearch(); }}
          className={cn(
            "flex items-center h-[30px] px-3.5 rounded-full text-[13px] font-semibold transition-all duration-150 shrink-0",
            !hasSearch && activeFolder === "inbox"
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/6",
          )}
        >
          Primary
        </button>

        {/* Icon-only category pills */}
        {categoryLabels.map((cat) => {
          const icon     = FOLDER_ICON[cat.id] ?? <Tag className="w-3.5 h-3.5" />;
          const isActive = !hasSearch && activeFolder === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveFolder(cat.id); clearSearch(); }}
              title={cat.label}
              className={cn(
                "w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-150 shrink-0",
                isActive
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/6",
              )}
            >
              {icon}
            </button>
          );
        })}

        {/* Saved searches */}
        {savedSearches && savedSearches.length > 0 && (
          <>
            <div className="w-px h-4 bg-black/8 dark:bg-white/8 mx-1 shrink-0" />
            {savedSearches.slice(0, 4).map((s) => {
              const isActive = hasSearch && searchQuery === s.query.searchText;
              return (
                <div key={s.id} className="group/ss shrink-0 flex items-center">
                  <button
                    onClick={() => setSearchQuery(s.query.searchText, null)}
                    title={s.name}
                    className={cn(
                      "flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[11.5px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : "bg-black/4 dark:bg-white/5 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55",
                    )}
                  >
                    <BookmarkCheck className="w-2.5 h-2.5 shrink-0 opacity-70" />
                    <span className="truncate max-w-[80px]">{s.name}</span>
                  </button>
                  <button
                    onClick={() => deleteSavedSearch.mutate(s.id)}
                    className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-gray-300 dark:text-white/15 hover:text-red-400 opacity-0 group-hover/ss:opacity-100 transition-all"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Row 3 — Active search context */}
      {hasSearch && (
        <div className="flex items-center gap-2 px-4 pb-2.5 -mt-1">
          <span className="text-[10.5px] text-gray-400 dark:text-white/25 shrink-0">
            {searchQuery?.trim() ? "Results for" : "Filtered by"}
          </span>
          <span className="text-[10.5px] font-medium text-gray-600 dark:text-white/50 truncate flex-1">
            {activeDesc}
          </span>
          <button
            onClick={clearSearch}
            className="shrink-0 text-[10.5px] text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/45 underline underline-offset-2 transition-colors"
          >
            clear
          </button>
        </div>
      )}

      <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VELOCITY TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────

function VelocityToolbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const {
    activeFolder, setActiveFolder,
    searchQuery, searchFilters,
    clearSearch, setSearchQuery,
    categoryLabels, savedSearches, deleteSavedSearch,
    hasSearch,
  } = useToolbarData();

  const filterTokens = useMemo(
    () => buildFilterTokens(searchQuery, searchFilters),
    [searchQuery, searchFilters],
  );

  const allTabs = useMemo(() => [
    { id: "inbox", label: "Inbox" },
    ...categoryLabels.map((c) => ({ id: c.id, label: c.label })),
  ], [categoryLabels]);

  return (
    <div className="shrink-0 flex flex-col select-none">

      {/* Row 1 — unified command bar */}
      <div className="flex items-stretch h-10 border-b border-black/[0.06] dark:border-white/[0.06]">

        {/* Folder tabs — underline style */}
        <div className="flex items-stretch overflow-x-auto scrollbar-none shrink-0">
          {allTabs.map((tab) => {
            const isActive = !hasSearch && activeFolder === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveFolder(tab.id); clearSearch(); }}
                className={cn(
                  "relative flex items-center px-3.5 h-full text-[12px] font-medium whitespace-nowrap transition-colors duration-100 tracking-[-0.01em]",
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55",
                )}
              >
                {tab.label}
                {isActive && (
                  // UPDATED: near-black underline (was also near-black, kept consistent)
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-zinc-900 dark:bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="flex items-center px-1 shrink-0">
          <div className="w-px h-4 bg-black/8 dark:bg-white/8" />
        </div>

        {/* Search area */}
        <button
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2 px-2 h-full min-w-0 group text-left"
        >
          <Search className="w-3 h-3 text-gray-300 dark:text-white/20 shrink-0 group-hover:text-gray-400 dark:group-hover:text-white/40 transition-colors" />

          {hasSearch ? (
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              {filterTokens.slice(0, 3).map((tok, i) => (
                <span
                  key={i}
                  className="shrink-0 px-1.5 py-[2px] rounded text-[10.5px] font-medium bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-white/55"
                >
                  {tok}
                </span>
              ))}
              {filterTokens.length > 3 && (
                <span className="text-[10.5px] text-gray-400 dark:text-white/30 shrink-0">
                  +{filterTokens.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <span className="flex-1 text-[12px] text-gray-300 dark:text-white/20 tracking-[-0.005em]">
              Search mail…
            </span>
          )}

          {!hasSearch && (
            <kbd className="shrink-0 text-[9px] font-mono text-gray-300 dark:text-white/18">
              ⌘K
            </kbd>
          )}
        </button>

        {/* Right action */}
        <div className="flex items-center pr-2 shrink-0">
          {hasSearch ? (
            <button
              onClick={clearSearch}
              title="Clear search"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/25 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/6 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={onOpenSearch}
              title="Filters (⌘K)"
              className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/5 dark:hover:bg-white/6 transition-all"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — saved searches strip */}
      {savedSearches && savedSearches.length > 0 && (
        <div className="flex items-center gap-1 px-3 h-[26px] border-b border-black/[0.04] dark:border-white/[0.04] overflow-x-auto scrollbar-none">
          <span className="text-[8.5px] font-bold tracking-[0.12em] uppercase text-gray-300 dark:text-white/18 shrink-0 mr-0.5 select-none">
            Saved
          </span>
          {savedSearches.slice(0, 6).map((s) => {
            const isActive = hasSearch && searchQuery === s.query.searchText;
            return (
              <div key={s.id} className="group/ss shrink-0 flex items-center">
                <button
                  onClick={() => setSearchQuery(s.query.searchText, null)}
                  className={cn(
                    "flex items-center gap-1 h-[18px] px-2 rounded text-[10px] font-medium transition-all",
                    isActive
                      // UPDATED: active saved search uses near-black (was blue-500) for monochrome consistency
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/55 hover:bg-black/4 dark:hover:bg-white/5",
                  )}
                >
                  <BookmarkCheck className="w-2.5 h-2.5 opacity-60 shrink-0" />
                  <span className="truncate max-w-[80px]">{s.name}</span>
                </button>
                <button
                  onClick={() => deleteSavedSearch.mutate(s.id)}
                  className="w-3 h-3 ml-0.5 flex items-center justify-center text-gray-300 hover:text-red-400 opacity-0 group-hover/ss:opacity-100 transition-all"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}