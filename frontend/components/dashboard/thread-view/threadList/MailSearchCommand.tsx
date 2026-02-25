"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandList, CommandItem, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { useUIStore } from "@/lib/store/ui.store";
import { mailboxKeys, useCreateSavedSearch, useDeleteSavedSearch } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import { cn } from "@/lib/utils";
import {
  Search, Clock, Bookmark, BookmarkCheck,
  Paperclip, SlidersHorizontal, X, ChevronRight,
  Star, Mail, MailOpen, Archive, ArrowUpRight,
} from "lucide-react";
import type { SearchEmail, SearchQueryParams } from "@/features/mailbox/mailbox.type";

// ── Helpers ──────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function stripMark(html: string) {
  return html.replace(/<\/?mark>/g, "");
}

function highlightMark(html: string) {
  return html.replace(
    /<mark>(.*?)<\/mark>/g,
    '<mark class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-sm px-px not-italic font-medium">$1</mark>',
  );
}

function parseQuery(raw: string): SearchQueryParams {
  const parts = raw.trim().split(/\s+/);
  const params: SearchQueryParams = { query: "" };
  const text: string[] = [];
  for (const p of parts) {
    if (p.startsWith("from:"))      params.filterFrom = p.slice(5);
    else if (p.startsWith("to:"))   params.filterTo = p.slice(3);
    else if (p === "is:unread")     params.isRead = false;
    else if (p === "is:read")       params.isRead = true;
    else if (p === "is:starred")    params.isStarred = true;
    else if (p === "is:archived")   params.isArchived = true;
    else if (p === "has:attachment") params.hasAttachments = true;
    else text.push(p);
  }
  params.query = text.join(" ");
  return params;
}

const LABEL_DISPLAY: Record<string, string> = {
  CATEGORY_PERSONAL:   "Personal",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_UPDATES:    "Updates",
  CATEGORY_SOCIAL:     "Social",
  CATEGORY_FORUMS:     "Forums",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
}

// ── Types ─────────────────────────────────────────────────────────────

interface ActiveFilters {
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  isArchived?: boolean;
  filterFrom?: string;
  filterTo?: string;
  dateFrom?: string;
  dateTo?: string;
  labels?: string;
}

// ── Inline Save Button ────────────────────────────────────────────────

function SaveButton({ searchText }: { searchText: string }) {
  const create = useCreateSavedSearch();
  if (create.isSuccess) return <BookmarkCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />;
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        create.mutate({ name: searchText, query: { searchText, filters: {} } });
      }}
      className="shrink-0 opacity-0 group-hover/item:opacity-100 p-1 rounded-md hover:bg-black/6 dark:hover:bg-white/8 text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 transition-all"
      title="Save search"
    >
      <Bookmark className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────
// Notion-style: inline chips above results, not a panel

const QUICK_FILTERS = [
  { label: "Unread",         key: "isRead"          as const, value: false, icon: Mail         },
  { label: "Read",           key: "isRead"          as const, value: true,  icon: MailOpen      },
  { label: "Starred",        key: "isStarred"       as const, value: true,  icon: Star          },
  { label: "Has attachment", key: "hasAttachments"  as const, value: true,  icon: Paperclip     },
  { label: "Archived",       key: "isArchived"      as const, value: true,  icon: Archive       },
];

function FilterBar({
  filters,
  onChange,
  expanded,
}: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  expanded: boolean;
}) {
  const toggle = (key: keyof ActiveFilters, value?: boolean) => {
    onChange({ ...filters, [key]: filters[key] === value ? undefined : value });
  };

  return (
    <div className="flex flex-col gap-0 border-b border-black/5 dark:border-white/5">
      {/* Quick filter chips — always visible */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none">
        {QUICK_FILTERS.map((f) => {
          const active = filters[f.key] === f.value;
          const Icon = f.icon;
          return (
            <button
              key={f.label}
              onMouseDown={(e) => { e.preventDefault(); toggle(f.key, f.value); }}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[12px] font-medium transition-all",
                active
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-black/5 dark:bg-white/6 text-gray-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white/65",
              )}
            >
              <Icon className="w-3 h-3" />
              {f.label}
            </button>
          );
        })}

        <div className="w-px h-4 bg-black/8 dark:bg-white/8 mx-0.5 shrink-0" />

        {/* Category labels */}
        {Object.entries(LABEL_DISPLAY).map(([key, label]) => (
          <button
            key={key}
            onMouseDown={(e) => { e.preventDefault(); onChange({ ...filters, labels: filters.labels === key ? undefined : key }); }}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[12px] font-medium transition-all",
              filters.labels === key
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-black/5 dark:bg-white/6 text-gray-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white/65",
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {label}
          </button>
        ))}
      </div>

      {/* Expanded: from / to / date inputs */}
      {expanded && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">From</label>
            <input
              value={filters.filterFrom ?? ""}
              onChange={(e) => onChange({ ...filters, filterFrom: e.target.value || undefined })}
              placeholder="sender@email.com"
              className="w-full h-8 px-3 rounded-lg text-[13px] bg-black/4 dark:bg-white/5 border border-transparent focus:border-black/10 dark:focus:border-white/10 outline-none text-gray-800 dark:text-white/75 placeholder:text-gray-400 dark:placeholder:text-white/20 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">To</label>
            <input
              value={filters.filterTo ?? ""}
              onChange={(e) => onChange({ ...filters, filterTo: e.target.value || undefined })}
              placeholder="recipient@email.com"
              className="w-full h-8 px-3 rounded-lg text-[13px] bg-black/4 dark:bg-white/5 border border-transparent focus:border-black/10 dark:focus:border-white/10 outline-none text-gray-800 dark:text-white/75 placeholder:text-gray-400 dark:placeholder:text-white/20 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">After</label>
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="w-full h-8 px-3 rounded-lg text-[13px] bg-black/4 dark:bg-white/5 border border-transparent focus:border-black/10 dark:focus:border-white/10 outline-none text-gray-800 dark:text-white/75 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">Before</label>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
              className="w-full h-8 px-3 rounded-lg text-[13px] bg-black/4 dark:bg-white/5 border border-transparent focus:border-black/10 dark:focus:border-white/10 outline-none text-gray-800 dark:text-white/75 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result Row ────────────────────────────────────────────────────────

function ResultRow({ email }: { email: SearchEmail }) {
  return (
    <div className="flex items-center gap-3 w-full min-w-0 py-0.5">
      <div className="shrink-0 w-1.5 flex items-center justify-center">
        {!email.isRead
          ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />
          : <span className="w-1.5 h-1.5 block" />
        }
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-4 items-center">
        {/* Left: from + subject */}
        <div className="min-w-0">
          <span className={cn(
            "text-[13px] truncate block",
            !email.isRead ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-600 dark:text-white/55",
          )}>
            {email.from.name || email.from.email}
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[12.5px] text-gray-500 dark:text-white/45 truncate"
              dangerouslySetInnerHTML={{ __html: highlightMark(email.subject) }}
            />
            {email.snippet && (
              <>
                <span className="text-gray-300 dark:text-white/15 shrink-0">—</span>
                <span className="text-[12px] text-gray-400 dark:text-white/28 truncate">
                  {stripMark(email.snippet).slice(0, 80)}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Right: date + icons */}
        <div className="flex items-center gap-2 shrink-0">
          {email.hasAttachments && <Paperclip className="w-3 h-3 text-gray-300 dark:text-white/20" />}
          {email.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          <span className="text-[11.5px] text-gray-400 dark:text-white/25">
            {formatDate(email.receivedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

interface MailSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailSearchCommand({ open, onOpenChange }: MailSearchCommandProps) {
  const [inputValue,    setInputValue]    = useState("");
  const [showFilters,   setShowFilters]   = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  const debouncedInput = useDebounce(inputValue, 300);
  const hasInput       = debouncedInput.trim().length > 0;
  const parsedQuery    = hasInput ? parseQuery(debouncedInput) : null;

  const filterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  // ── Queries ──

  const { data: recentData } = useQuery({
    queryKey: mailboxKeys.recentSearches(),
    queryFn:  mailboxService.getRecentSearches,
    staleTime: 30_000,
    enabled:  open,
  });

  const { data: savedData } = useQuery({
    queryKey: mailboxKeys.savedSearches(),
    queryFn:  mailboxService.getSavedSearches,
    staleTime: 60_000,
    enabled:  open,
    select:   (d) => d.data,
  });

  const { data: recentThreadsData } = useQuery({
    queryKey: [...mailboxKeys.threads(), "recent-5"],
    queryFn:  () => mailboxService.getThreadEmails({ size: 5, page: 0 }),
    staleTime: 30_000,
    enabled:  open && !hasInput,
  });

  const searchParams: SearchQueryParams | null = parsedQuery
    ? { ...parsedQuery, ...activeFilters, query: parsedQuery.query || debouncedInput.trim(), size: 10 }
    : null;

  const { data: liveResults, isFetching: isSearching } = useQuery({
    queryKey: [...mailboxKeys.search(searchParams ?? { query: "" }), "live"],
    queryFn:  () => mailboxService.searchEmails(searchParams!),
    enabled:  !!searchParams,
    staleTime: 15_000,
  });

  const deleteSavedSearch = useDeleteSavedSearch();

  const recentSearches = recentData?.data?.slice(0, 5) ?? [];
  const savedSearches  = savedData?.slice(0, 5) ?? [];
  const recentThreads  = recentThreadsData?.data?.threads?.slice(0, 4) ?? [];
  const results        = liveResults?.emails ?? [];

  // ── Handlers ──

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      setInputValue("");
      setShowFilters(false);
      setFilterExpanded(false);
      setActiveFilters({});
    }
    onOpenChange(next);
  }, [onOpenChange]);

  const commit = useCallback((query: string, threadId?: string) => {
    setSearchQuery(query.trim() || null);
    if (threadId) setActiveThread(threadId);
    handleOpenChange(false);
  }, [setSearchQuery, setActiveThread, handleOpenChange]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      // If there are results, open the first one; otherwise commit as search
      if (results.length > 0) {
        commit(inputValue.trim(), results[0].threadId);
      } else {
        commit(inputValue.trim());
      }
    }
    if (e.key === "Escape") {
      handleOpenChange(false);
    }
  };

  // ── Active filter chips for display ──
  const activeChips: { label: string; remove: () => void }[] = [];
  if (activeFilters.isRead === false) activeChips.push({ label: "Unread",          remove: () => setActiveFilters(f => ({ ...f, isRead: undefined })) });
  if (activeFilters.isRead === true)  activeChips.push({ label: "Read",            remove: () => setActiveFilters(f => ({ ...f, isRead: undefined })) });
  if (activeFilters.isStarred)        activeChips.push({ label: "Starred",         remove: () => setActiveFilters(f => ({ ...f, isStarred: undefined })) });
  if (activeFilters.hasAttachments)   activeChips.push({ label: "Has attachment",  remove: () => setActiveFilters(f => ({ ...f, hasAttachments: undefined })) });
  if (activeFilters.isArchived)       activeChips.push({ label: "Archived",        remove: () => setActiveFilters(f => ({ ...f, isArchived: undefined })) });
  if (activeFilters.filterFrom)       activeChips.push({ label: `from: ${activeFilters.filterFrom}`,  remove: () => setActiveFilters(f => ({ ...f, filterFrom: undefined })) });
  if (activeFilters.filterTo)         activeChips.push({ label: `to: ${activeFilters.filterTo}`,      remove: () => setActiveFilters(f => ({ ...f, filterTo: undefined })) });
  if (activeFilters.dateFrom)         activeChips.push({ label: `after: ${activeFilters.dateFrom}`,   remove: () => setActiveFilters(f => ({ ...f, dateFrom: undefined })) });
  if (activeFilters.dateTo)           activeChips.push({ label: `before: ${activeFilters.dateTo}`,    remove: () => setActiveFilters(f => ({ ...f, dateTo: undefined })) });
  if (activeFilters.labels)           activeChips.push({ label: LABEL_DISPLAY[activeFilters.labels] ?? activeFilters.labels, remove: () => setActiveFilters(f => ({ ...f, labels: undefined })) });

  if (!open) return null;

  return (
    // Full-screen overlay — no sidebar, no Dialog chrome
    <div className="no-sidebar fixed inset-0 z-[999] flex flex-col items-center pt-[12vh] bg-black/40 dark:bg-black/60 backdrop-blur-[2px]">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={() => handleOpenChange(false)} />

      {/* Palette */}
      <div
        className="relative w-full max-w-3xl mx-4 rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl shadow-black/25 dark:shadow-black/70 border border-black/8 dark:border-white/8 overflow-hidden flex flex-col"
        style={{ maxHeight: "70vh" }}
      >
        <Command shouldFilter={false} className="flex flex-col overflow-hidden bg-transparent">

          {/* ── Input row ── */}
          <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-black/5 dark:border-white/5">
            <Search className="w-5 h-5 text-gray-400 dark:text-white/25 shrink-0" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Search mail… try "from:name" or "has:attachment"'
              className="flex-1 text-[15px] bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25"
            />
            <div className="flex items-center gap-2 shrink-0">
              {isSearching && (
                <span className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-gray-500 dark:border-white/10 dark:border-t-white/40 animate-spin" />
              )}
              {/* Filter toggle — Notion-style button */}
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowFilters(!showFilters); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12.5px] font-medium transition-all",
                  showFilters || filterCount > 0
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "bg-black/5 dark:bg-white/7 text-gray-500 dark:text-white/40 hover:bg-black/8 dark:hover:bg-white/10",
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {filterCount}
                  </span>
                )}
              </button>
              {(inputValue || filterCount > 0) && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setInputValue(""); setActiveFilters({}); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/6 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Filter bar — Notion-style inline, not a panel ── */}
          {showFilters && (
            <FilterBar
              filters={activeFilters}
              onChange={setActiveFilters}
              expanded={filterExpanded}
            />
          )}

          {/* More filters toggle */}
          {showFilters && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setFilterExpanded(!filterExpanded); }}
              className="flex items-center gap-1 px-4 py-1.5 text-[11.5px] text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors border-b border-black/5 dark:border-white/5"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", filterExpanded && "rotate-90")} />
              {filterExpanded ? "Hide" : "More"} filters (from, to, date)
            </button>
          )}

          {/* ── Active filter chips ── */}
          {activeChips.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 flex-wrap border-b border-black/5 dark:border-white/5">
              {activeChips.map((chip) => (
                <span
                  key={chip.label}
                  className="flex items-center gap-1 pl-2.5 pr-1.5 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 text-[11.5px] font-medium text-blue-700 dark:text-blue-300"
                >
                  {chip.label}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); chip.remove(); }}
                    className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); setActiveFilters({}); }}
                className="text-[11.5px] text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors ml-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ── Results list ── */}
          <CommandList className="overflow-y-auto flex-1 py-2">

            {/* TYPING STATE: live results */}
            {hasInput && (
              <>
                {results.length > 0 ? (
                  <CommandGroup
                    heading={
                      <div className="flex items-center justify-between px-0">
                        <span>Results</span>
                        {liveResults && (
                          <span className="font-normal text-gray-400 dark:text-white/25 normal-case tracking-normal">
                            {liveResults.total} found — press ↵ to open first
                          </span>
                        )}
                      </div>
                    }
                    className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:dark:text-white/25"
                  >
                    {results.map((email) => (
                      <CommandItem
                        key={email.id}
                        value={email.id}
                        onSelect={() => commit(inputValue.trim(), email.threadId)}
                        className="px-4 py-2.5 mx-1 rounded-xl cursor-pointer group/item aria-selected:bg-black/4 dark:aria-selected:bg-white/5"
                      >
                        <ResultRow email={email} />
                      </CommandItem>
                    ))}

                    {liveResults && liveResults.total > 10 && (
                      <CommandItem
                        value="__view_all__"
                        onSelect={() => commit(inputValue.trim())}
                        className="px-4 py-2.5 mx-1 rounded-xl cursor-pointer group/item aria-selected:bg-black/4 dark:aria-selected:bg-white/5"
                      >
                        <div className="flex items-center gap-2.5 w-full text-gray-500 dark:text-white/40">
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[13px]">
                            View all{" "}
                            <span className="font-semibold text-gray-700 dark:text-white/60">
                              {liveResults.total}
                            </span>{" "}
                            results
                          </span>
                        </div>
                      </CommandItem>
                    )}
                  </CommandGroup>
                ) : !isSearching ? (
                  <div className="flex flex-col items-center gap-2 py-12">
                    <span className="text-3xl opacity-15 select-none">◎</span>
                    <p className="text-[13.5px] text-gray-400 dark:text-white/30">
                      No results for &ldquo;{debouncedInput}&rdquo;
                    </p>
                    <p className="text-[12px] text-gray-300 dark:text-white/20">
                      Try <span className="font-mono">from:{debouncedInput}</span> to search by sender
                    </p>
                  </div>
                ) : null}
              </>
            )}

            {/* EMPTY STATE */}
            {!hasInput && (
              <>
                {/* Jump back in */}
                {recentThreads.length > 0 && (
                  <CommandGroup
                    heading="Jump back in"
                    className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:dark:text-white/25"
                  >
                    {recentThreads.map((t) => (
                      <CommandItem
                        key={t.threadId}
                        value={`thread_${t.threadId}`}
                        onSelect={() => { setActiveThread(t.threadId); handleOpenChange(false); }}
                        className="px-4 py-2.5 mx-1 rounded-xl cursor-pointer aria-selected:bg-black/4 dark:aria-selected:bg-white/5"
                      >
                        <div className="flex items-center gap-3 w-full min-w-0">
                          <div className="w-1.5 shrink-0">
                            {t.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block" />}
                          </div>
                          <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-4 items-center">
                            <div className="min-w-0">
                              <span className={cn(
                                "text-[13px] block truncate",
                                t.isUnread ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-600 dark:text-white/55",
                              )}>
                                {t.from.name || t.from.email}
                              </span>
                              <span className="text-[12.5px] text-gray-500 dark:text-white/40 truncate block">
                                {t.subject}
                              </span>
                            </div>
                            <span className="text-[11.5px] text-gray-400 dark:text-white/25 shrink-0">
                              {formatDate(t.receivedAt)}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <>
                    {recentThreads.length > 0 && <CommandSeparator className="my-1 bg-black/5 dark:bg-white/5" />}
                    <CommandGroup
                      heading={
                        <div className="flex items-center justify-between">
                          <span>Recent searches</span>
                        </div>
                      }
                      className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:dark:text-white/25"
                    >
                      {recentSearches.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`recent_${s.id}`}
                          onSelect={() => commit(s.searchText)}
                          className="px-4 py-2 mx-1 rounded-xl cursor-pointer group/item aria-selected:bg-black/4 dark:aria-selected:bg-white/5"
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-white/20 shrink-0" />
                            <span className="text-[13px] text-gray-600 dark:text-white/55 flex-1 font-mono truncate">
                              {s.searchText}
                            </span>
                            <SaveButton searchText={s.searchText} />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {/* Saved searches */}
                {savedSearches.length > 0 && (
                  <>
                    <CommandSeparator className="my-1 bg-black/5 dark:bg-white/5" />
                    <CommandGroup
                      heading="Saved searches"
                      className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:dark:text-white/25"
                    >
                      {savedSearches.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`saved_${s.id}`}
                          onSelect={() => commit(s.query.searchText)}
                          className="px-4 py-2 mx-1 rounded-xl cursor-pointer group/item aria-selected:bg-black/4 dark:aria-selected:bg-white/5"
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <BookmarkCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="text-[13px] text-gray-700 dark:text-white/65 flex-1 truncate">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                              {s.isPinned && (
                                <span className="text-[10.5px] text-gray-400 dark:text-white/25 px-1.5 py-0.5 rounded-full bg-black/4 dark:bg-white/5">
                                  pinned
                                </span>
                              )}
                              <button
                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteSavedSearch.mutate(s.id); }}
                                className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-300 dark:text-white/20 hover:text-red-500 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {/* True empty */}
                {recentSearches.length === 0 && savedSearches.length === 0 && recentThreads.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-16">
                    <Search className="w-10 h-10 text-gray-150 dark:text-white/8" />
                    <p className="text-[14px] font-medium text-gray-400 dark:text-white/30">Search your mail</p>
                    <p className="text-[12px] text-gray-300 dark:text-white/20 text-center">
                      Try &ldquo;from:name&rdquo;, &ldquo;has:attachment&rdquo;, &ldquo;is:unread&rdquo;
                    </p>
                  </div>
                )}
              </>
            )}
          </CommandList>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/5 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-4">
              {[
                { key: "↵", label: "open" },
                { key: "↑↓", label: "navigate" },
                { key: "esc", label: "close" },
              ].map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-white/25">
                  <kbd className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/6 font-mono text-[10px] text-gray-500 dark:text-white/35">
                    {key}
                  </kbd>
                  {label}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-gray-300 dark:text-white/18">⌘K</span>
          </div>
        </Command>
      </div>
    </div>
  );
}