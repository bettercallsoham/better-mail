"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import {
  mailboxKeys,
  useDeleteSavedSearch,
  useCreateSavedSearch,
  useUpdateSavedSearch,
} from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import { cn } from "@/lib/utils";
import {
  Search, X, Tag, UserRound, Bell, TriangleAlert, SlidersHorizontal,
} from "lucide-react";
import { MailSearchCommand } from "../../MailSearchCommand";
import { SavedSearchesStrip } from "./components/SavedSearchesStrip";
import type { SearchFilters } from "@/lib/store/ui.store";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";

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
  if (f?.labels?.length)       f.labels.forEach((l) => parts.push(l.replace(/^CATEGORY_/, "").toLowerCase()));
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
  if (f?.labels?.length)       f.labels.forEach((l) => t.push(l.replace(/^CATEGORY_/, "").toLowerCase()));
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
  const createSavedSearch = useCreateSavedSearch();
  const updateSavedSearch = useUpdateSavedSearch();

  const categoryLabels = useMemo(
    () =>
      foldersData?.data?.labels
        ?.filter((l) => LABEL_DISPLAY[l.label])
        .map((l) => ({
          id:    `label:${l.label}`,
          label: LABEL_DISPLAY[l.label],
          raw:   l.label,
        })) ?? [],
    [foldersData],
  );

  const hasSearch  = !!(searchQuery || searchFilters);
  const activeDesc = hasSearch ? summariseFilters(searchQuery, searchFilters) : null;

  return {
    activeFolder, setActiveFolder,
    searchQuery, searchFilters,
    clearSearch, setSearchQuery,
    categoryLabels, savedSearches,
    deleteSavedSearch, createSavedSearch, updateSavedSearch,
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
    searchQuery, searchFilters,
    clearSearch, setSearchQuery,
    categoryLabels, savedSearches,
    deleteSavedSearch, createSavedSearch, updateSavedSearch,
    hasSearch, activeDesc,
  } = useToolbarData();

  const handleLiveApply   = (q: string, f: SearchFilters | null) => setSearchQuery(q, f);
  const handleSelectSaved = (s: SavedSearch) =>
    setSearchQuery(s.query.searchText, (s.query.filters as SearchFilters) ?? null);

  return (
    <div className="shrink-0 flex flex-col select-none">

      {/* Row 1 — Search bar */}
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
          <kbd className="shrink-0 text-[10px] font-mono text-gray-300 dark:text-white/18 tracking-tight">⌘K</kbd>
        </button>
        {hasSearch && (
          <button onClick={clearSearch} className="w-5 h-5 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row 2 — Folder tabs */}
      <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
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
      </div>

      {/* Row 3 — Active search context banner */}
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

      {/* Row 4 — Saved filters strip */}
      <SavedSearchesStrip
        savedSearches={savedSearches}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
        hasSearch={hasSearch}
        categoryLabels={categoryLabels}
        onLiveApply={handleLiveApply}
        onSelectSaved={handleSelectSaved}
        deleteSavedSearch={deleteSavedSearch}
        createSavedSearch={createSavedSearch}
        updateSavedSearch={updateSavedSearch}
      />

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
    categoryLabels, savedSearches,
    deleteSavedSearch, createSavedSearch, updateSavedSearch,
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

  const handleLiveApply   = (q: string, f: SearchFilters | null) => setSearchQuery(q, f);
  const handleSelectSaved = (s: SavedSearch) =>
    setSearchQuery(s.query.searchText, (s.query.filters as SearchFilters) ?? null);

  return (
    <div className="shrink-0 flex flex-col select-none">

      {/* Row 1 — command bar */}
      <div className="flex items-stretch h-10 border-b border-black/[0.06] dark:border-white/[0.06]">

        {/* Folder tabs */}
        <div className="flex items-center gap-px px-2 overflow-x-auto no-scrollbar shrink-0">
          {allTabs.map((tab) => {
            const isActive = !hasSearch && activeFolder === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveFolder(tab.id); clearSearch(); }}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 h-[28px] rounded-md",
                  "text-[11.5px] whitespace-nowrap transition-all duration-100 tracking-[-0.01em]",
                  isActive
                    ? "font-semibold text-gray-900 dark:text-white/90 bg-black/[0.06] dark:bg-white/[0.08]"
                    : "font-medium text-gray-400 dark:text-white/28 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
                )}
              >
                {isActive && <span className="w-1 h-1 rounded-full bg-gray-700 dark:bg-white/70 shrink-0" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center px-1 shrink-0">
          <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />
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
                <span key={i} className="shrink-0 px-1.5 py-[2px] rounded text-[10.5px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/55">
                  {tok}
                </span>
              ))}
              {filterTokens.length > 3 && (
                <span className="text-[10.5px] text-gray-400 dark:text-white/30 shrink-0">+{filterTokens.length - 3} more</span>
              )}
            </div>
          ) : (
            <span className="flex-1 text-[12px] text-gray-300 dark:text-white/20 tracking-[-0.005em]">Search mail…</span>
          )}
          {!hasSearch && (
            <kbd className="shrink-0 text-[9px] font-mono text-gray-300 dark:text-white/18">⌘K</kbd>
          )}
        </button>

        <div className="flex items-center pr-2 shrink-0">
          {hasSearch ? (
            <button onClick={clearSearch} title="Clear search" className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/25 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onOpenSearch} title="Filters (⌘K)" className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all">
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — Saved filters strip */}
      <SavedSearchesStrip
        savedSearches={savedSearches}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
        hasSearch={hasSearch}
        categoryLabels={categoryLabels}
        onLiveApply={handleLiveApply}
        onSelectSaved={handleSelectSaved}
        deleteSavedSearch={deleteSavedSearch}
        createSavedSearch={createSavedSearch}
        updateSavedSearch={updateSavedSearch}
      />
    </div>
  );
}