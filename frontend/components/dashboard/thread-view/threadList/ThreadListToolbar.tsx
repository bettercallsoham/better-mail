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
import { Search, X, Tag, UserRound, Bell, TriangleAlert, SlidersHorizontal } from "lucide-react";
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
// Token system
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterToken {
  key:    string;
  label:  string;
  remove: () => void;
}

/**
 * Build removable display tokens from the active search state.
 * Uses `undefined` assignment (never `delete`) to satisfy TS strict mode.
 */
export function buildTokens(
  q: string | null,
  f: SearchFilters | null,
  setSearchQuery: (q: string, f: SearchFilters | null) => void,
  clearSearch: () => void,
): FilterToken[] {
  const tokens: FilterToken[] = [];
  const hasF = f && Object.keys(f).some((k) => (f as Record<string, unknown>)[k] !== undefined);

  if (q?.trim()) {
    tokens.push({
      key: "q", label: q.trim(),
      remove: () => hasF ? setSearchQuery("", f) : clearSearch(),
    });
  }

  if (f?.isRead === false) tokens.push({ key: "unread", label: "Unread",
    remove: () => setSearchQuery(q ?? "", { ...f, isRead: undefined }) });

  if (f?.isRead === true) tokens.push({ key: "read", label: "Read",
    remove: () => setSearchQuery(q ?? "", { ...f, isRead: undefined }) });

  if (f?.isStarred) tokens.push({ key: "starred", label: "Starred",
    remove: () => setSearchQuery(q ?? "", { ...f, isStarred: undefined }) });

  if (f?.hasAttachments) tokens.push({ key: "attachment", label: "Attachment",
    remove: () => setSearchQuery(q ?? "", { ...f, hasAttachments: undefined }) });

  if (f?.isArchived) tokens.push({ key: "archived", label: "Archived",
    remove: () => setSearchQuery(q ?? "", { ...f, isArchived: undefined }) });

  if (f?.filterFrom) tokens.push({ key: "from", label: `from:${f.filterFrom}`,
    remove: () => setSearchQuery(q ?? "", { ...f, filterFrom: undefined }) });

  if (f?.filterTo) tokens.push({ key: "to", label: `to:${f.filterTo}`,
    remove: () => setSearchQuery(q ?? "", { ...f, filterTo: undefined }) });

  if (f?.labels?.length) {
    f.labels.forEach((l) => tokens.push({
      key: l, label: l.replace(/^CATEGORY_/, "").toLowerCase(),
      remove: () => {
        const next = { ...f, labels: f.labels!.filter((x) => x !== l) };
        setSearchQuery(q ?? "", { ...next, labels: next.labels!.length ? next.labels : undefined });
      },
    }));
  }

  if (f?.dateFrom) tokens.push({ key: "after", label: `after:${f.dateFrom}`,
    remove: () => setSearchQuery(q ?? "", { ...f, dateFrom: undefined }) });

  return tokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable token pill (used in both toolbars)
// ─────────────────────────────────────────────────────────────────────────────

export function TokenPill({
  token,
  size = "md",
}: {
  token: FilterToken;
  size?: "sm" | "md";
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-medium shrink-0",
      "bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-white/60",
      size === "sm"
        ? "h-[18px] px-1.5 text-[10px]"
        : "h-[22px] px-2 text-[11px]",
    )}>
      <span className="truncate max-w-[120px]">{token.label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); token.remove(); }}
        className="text-gray-400 dark:text-white/28 hover:text-gray-700 dark:hover:text-white/70 transition-colors shrink-0 ml-px"
      >
        <X className={size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"} />
      </button>
    </span>
  );
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

  const hasSearch = !!(searchQuery || searchFilters);

  const tokens = useMemo(
    () => buildTokens(searchQuery, searchFilters, setSearchQuery, clearSearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchQuery, searchFilters],
  );

  return {
    activeFolder, setActiveFolder,
    searchQuery, searchFilters,
    clearSearch, setSearchQuery,
    categoryLabels, savedSearches,
    deleteSavedSearch, createSavedSearch, updateSavedSearch,
    hasSearch, tokens,
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
        ? <FlowToolbar     onOpenSearch={() => setCmdOpen(true)} />
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
    hasSearch, tokens,
  } = useToolbarData();

  const handleSelectSaved = (s: SavedSearch) =>
    setSearchQuery(s.query.searchText ?? "", (s.query.filters as SearchFilters) ?? null);

  return (
    <div className="shrink-0 flex flex-col select-none">

      {/* Row 1 — search bar */}
      <div className="flex items-center gap-2 px-4 h-[42px]">
        <button
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-2.5 text-left group min-w-0 overflow-hidden"
        >
          <Search className="w-3.5 h-3.5 text-gray-300 dark:text-white/20 shrink-0 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors" />
          {hasSearch ? (
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              {tokens.slice(0, 3).map((tok) => (
                <TokenPill key={tok.key} token={tok} size="sm" />
              ))}
              {tokens.length > 3 && (
                <span className="text-[10px] text-gray-400 dark:text-white/28 shrink-0">
                  +{tokens.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="flex-1 text-[13px] text-gray-300 dark:text-white/20">Search</span>
          )}
          {!hasSearch && (
            <kbd className="shrink-0 text-[10px] font-mono text-gray-300 dark:text-white/18 tracking-tight">⌘K</kbd>
          )}
        </button>

        {hasSearch && (
          <button
            onClick={clearSearch}
            title="Clear all"
            className="w-5 h-5 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

 

      {/* Row 3 — active token pills (individually removable) */}
      {hasSearch && tokens.length > 0 && (
        <div className="flex items-center  gap-1.5 px-4 pb-2.5 -mt-0.5 flex-wrap">
          {tokens.map((tok) => (
            <TokenPill key={tok.key} token={tok} size="md" />
          ))}
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 h-[22px] px-1.5 rounded-md text-[10.5px] font-medium text-gray-400 dark:text-white/22 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/[0.07] transition-all"
          >
            <X className="w-2.5 h-2.5" />
            Clear all
          </button>
        </div>
      )}

      {/* Row 4 — saved filters strip */}
      <SavedSearchesStrip
        savedSearches={savedSearches}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
        hasSearch={hasSearch}
        categoryLabels={categoryLabels}
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
    hasSearch, tokens,
  } = useToolbarData();

  const allTabs = useMemo(() => [
    { id: "inbox", label: "Inbox" },
    ...categoryLabels.map((c) => ({ id: c.id, label: c.label })),
  ], [categoryLabels]);

  const handleSelectSaved = (s: SavedSearch) =>
    setSearchQuery(s.query.searchText ?? "", (s.query.filters as SearchFilters) ?? null);

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
          className="flex-1 flex items-center gap-1.5 px-2 h-full min-w-0 group text-left overflow-hidden"
        >
          <Search className="w-3 h-3 text-gray-300 dark:text-white/20 shrink-0 group-hover:text-gray-400 dark:group-hover:text-white/40 transition-colors" />
          {hasSearch ? (
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              {tokens.slice(0, 3).map((tok) => (
                <span key={tok.key} className="shrink-0 h-[18px] px-1.5 rounded text-[10.5px] font-medium bg-black/[0.06] dark:bg-white/[0.08] text-gray-600 dark:text-white/55">
                  {tok.label}
                </span>
              ))}
              {tokens.length > 3 && (
                <span className="text-[10.5px] text-gray-400 dark:text-white/30 shrink-0">
                  +{tokens.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="flex-1 text-[12px] text-gray-300 dark:text-white/20 tracking-[-0.005em]">
              Search mail…
            </span>
          )}
          {!hasSearch && (
            <kbd className="shrink-0 text-[9px] font-mono text-gray-300 dark:text-white/18 ml-auto">⌘K</kbd>
          )}
        </button>

        <div className="flex items-center pr-2 shrink-0">
          {hasSearch ? (
            <button onClick={clearSearch} title="Clear" className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/25 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onOpenSearch} title="Filters (⌘K)" className="w-6 h-6 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/5 dark:hover:bg-white/[0.06] transition-all">
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — saved filters strip */}
      <SavedSearchesStrip
        savedSearches={savedSearches}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
        hasSearch={hasSearch}
        categoryLabels={categoryLabels}
        onSelectSaved={handleSelectSaved}
        deleteSavedSearch={deleteSavedSearch}
        createSavedSearch={createSavedSearch}
        updateSavedSearch={updateSavedSearch}
      />
    </div>
  );
}