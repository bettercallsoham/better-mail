"use client";

import { useState, useEffect, useCallback, useReducer, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import type { SearchQueryParams } from "@/features/mailbox/mailbox.type";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveFilters {
  isRead?:         boolean;
  isStarred?:      boolean;
  hasAttachments?: boolean;
  isArchived?:     boolean;
  filterFrom?:     string;
  filterTo?:       string;
  dateFrom?:       string;
  dateTo?:         string;
  // FIX: string[] to match SearchFilters in ui.store — labels are multi-select
  labels?:         string[];
}

type FilterAction =
  | { type: "SET";   filters: ActiveFilters }
  | { type: "PATCH"; patch: Partial<ActiveFilters> }
  | { type: "RESET" };

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard shortcut aliases
// ─────────────────────────────────────────────────────────────────────────────

export const SHORTCUT_MAP: Record<string, { ghost: string; expansion: string }> = {
  u: { ghost: " · is:unread",      expansion: "is:unread "      },
  s: { ghost: " · is:starred",     expansion: "is:starred "     },
  f: { ghost: " · from:",          expansion: "from:"           },
  t: { ghost: " · to:",            expansion: "to:"             },
  a: { ghost: " · has:attachment", expansion: "has:attachment " },
  e: { ghost: " · is:archived",    expansion: "is:archived "    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Operator promotion map
// ─────────────────────────────────────────────────────────────────────────────

const PROMOTABLE: Array<{
  match: string;
  apply: (f: ActiveFilters) => ActiveFilters;
}> = [
  { match: "is:unread",      apply: (f) => ({ ...f, isRead: false }) },
  { match: "is:read",        apply: (f) => ({ ...f, isRead: true  }) },
  { match: "is:starred",     apply: (f) => ({ ...f, isStarred: true }) },
  { match: "is:archived",    apply: (f) => ({ ...f, isArchived: true }) },
  { match: "has:attachment", apply: (f) => ({ ...f, hasAttachments: true }) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractOperators(raw: string): { cleaned: string; delta: ActiveFilters } {
  if (!raw.includes(":")) return { cleaned: raw, delta: {} };
  let cleaned = raw;
  const delta: ActiveFilters = {};
  for (const op of PROMOTABLE) {
    const re = new RegExp(`(?:^|\\s)${op.match}(?=\\s|$)`, "gi");
    if (re.test(cleaned)) {
      Object.assign(delta, op.apply({}));
      cleaned = cleaned.replace(re, " ").replace(/\s{2,}/g, " ").trim();
    }
  }
  return { cleaned, delta };
}

function detectInProgressOperator(
  raw: string,
): { prefix: "from" | "to"; partial: string } | null {
  if (!raw.includes(":")) return null;
  const match = raw.match(/(?:^|\s)(from:|to:)(\S*)$/i);
  if (!match) return null;
  return {
    prefix:  match[1].replace(":", "").toLowerCase() as "from" | "to",
    partial: match[2],
  };
}

export function parseQuery(raw: string): SearchQueryParams {
  const params: SearchQueryParams = { query: "" };
  const text: string[] = [];
  for (const p of raw.trim().split(/\s+/)) {
    if      (p.startsWith("from:"))  params.filterFrom     = p.slice(5);
    else if (p.startsWith("to:"))    params.filterTo       = p.slice(3);
    else if (p === "is:unread")      params.isRead         = false;
    else if (p === "is:read")        params.isRead         = true;
    else if (p === "is:starred")     params.isStarred      = true;
    else if (p === "is:archived")    params.isArchived     = true;
    else if (p === "has:attachment") params.hasAttachments = true;
    else text.push(p);
  }
  params.query = text.join(" ");
  return params;
}

function buildSearchParams(
  parsed:  SearchQueryParams | null,
  filters: ActiveFilters,
  size = 8,
): SearchQueryParams | null {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
  if (!parsed && !hasFilters) return null;

  const merged: SearchQueryParams = {
    ...filters,
    // FIX: SearchQueryParams.labels expects string — join array here at the
    // boundary so neither side has to change its natural representation.
    labels: filters.labels?.join(","),
    size,
    query:  parsed?.query?.trim() || " ",
  };

  if (parsed?.filterFrom     && !merged.filterFrom)                             merged.filterFrom     = parsed.filterFrom;
  if (parsed?.filterTo       && !merged.filterTo)                               merged.filterTo       = parsed.filterTo;
  if (parsed?.isRead         !== undefined && merged.isRead         === undefined) merged.isRead       = parsed.isRead;
  if (parsed?.isStarred      !== undefined && merged.isStarred      === undefined) merged.isStarred    = parsed.isStarred;
  if (parsed?.isArchived     !== undefined && merged.isArchived     === undefined) merged.isArchived   = parsed.isArchived;
  if (parsed?.hasAttachments !== undefined && merged.hasAttachments === undefined) merged.hasAttachments = parsed.hasAttachments;

  return merged;
}

function dedupeRecentSearches<T extends { searchText: string }>(items: T[]): T[] {
  const meaningful = items.filter((r) => r.searchText.trim().length > 2);
  return meaningful.filter(
    (r) => !meaningful.some(
      (other) =>
        other.searchText !== r.searchText &&
        other.searchText.toLowerCase().startsWith(r.searchText.toLowerCase()),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function filtersReducer(state: ActiveFilters, action: FilterAction): ActiveFilters {
  switch (action.type) {
    case "SET":   return action.filters;
    case "PATCH": return { ...state, ...action.patch };
    case "RESET": return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSearchState(open: boolean, onOpenChange: (v: boolean) => void) {
  const [input,            setInputRaw]    = useState("");
  const [filters,          dispatchFilter] = useReducer(filtersReducer, {});
  const [focusedIdx,       setFocusedIdx]  = useState(-1);
  const [showPreview,      setShowPreview] = useState(true);
  const [hoveredThreadId,  setHoveredThreadId] = useState<string | null>(null);

  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  const setFilters = useCallback((f: ActiveFilters) => {
    dispatchFilter({ type: "SET", filters: f });
    setFocusedIdx(-1);
  }, []);

  const setInput = useCallback((raw: string) => {
    setFocusedIdx(-1);
    if (!raw.includes(":")) { setInputRaw(raw); return; }
    const { cleaned, delta } = extractOperators(raw);
    if (Object.keys(delta).length > 0) {
      dispatchFilter({ type: "PATCH", patch: delta });
      setInputRaw(cleaned);
    } else {
      setInputRaw(raw);
    }
  }, []);

  const debounced    = useDebounce(input, 280);
  const hasInput     = useMemo(() => debounced.trim().length > 0, [debounced]);
  const filterCount  = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length,
    [filters],
  );
  const parsed       = useMemo(() => (hasInput ? parseQuery(debounced) : null), [hasInput, debounced]);
  const inProgress   = useMemo(() => detectInProgressOperator(input), [input]);
  const searchParams = useMemo(
    () => (inProgress ? null : buildSearchParams(parsed, filters, 8)),
    [inProgress, parsed, filters],
  );

  const ghostSuffix = useMemo(() => {
    const trimmed = input.trim();
    if (trimmed.length !== 1) return null;
    return SHORTCUT_MAP[trimmed]?.ghost ?? null;
  }, [input]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: recentData } = useQuery({
    queryKey: mailboxKeys.recentSearches(),
    queryFn:  mailboxService.getRecentSearches,
    staleTime: 30_000,
    enabled:  open,
  });

  const { data: recentThreadsData } = useQuery({
    queryKey: [...mailboxKeys.threads(), "recent-5"],
    queryFn:  () => mailboxService.getThreadEmails({ size: 5, page: 0 }),
    staleTime: 30_000,
    enabled:  open && !hasInput,
  });

  const { data: savedData } = useQuery({
    queryKey: mailboxKeys.savedSearches(),
    queryFn:  mailboxService.getSavedSearches,
    staleTime: 60_000,
    gcTime:   10 * 60 * 1000,
    enabled:  open,
    select:   (d) => d.data as SavedSearch[],
  });

  const { data: inlineSuggestData } = useQuery({
    queryKey: mailboxKeys.suggestions({ query: inProgress?.partial, limit: 6 }),
    queryFn:  () => mailboxService.getEmailSuggestions(inProgress?.partial || undefined, 6),
    staleTime: 30_000,
    enabled:  !!inProgress,
  });

  const { data: liveResults, isFetching } = useQuery({
    queryKey: ["search-live", searchParams],
    queryFn:  () => mailboxService.searchEmails(searchParams!),
    enabled:  !!searchParams,
    staleTime: 15_000,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const results        = liveResults?.emails ?? [];
  const total          = liveResults?.total  ?? 0;
  const recentSearches = useMemo(
    () => dedupeRecentSearches(recentData?.data ?? []).slice(0, 6),
    [recentData],
  );
  const recentThreads     = recentThreadsData?.data?.threads?.slice(0, 5) ?? [];
  const inlineSuggestions = inProgress ? (inlineSuggestData?.data?.suggestions ?? []) : [];

  const savedSearches = useMemo(() => {
    const all = savedData ?? [];
    return [...all]
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.usageCount - a.usageCount;
      })
      .slice(0, 6);
  }, [savedData]);

  const focusedEmail = useMemo(
    () => (!inProgress && focusedIdx >= 0 ? results[focusedIdx] ?? null : null),
    [focusedIdx, results, inProgress],
  );

  const close = useCallback(() => {
    setInputRaw("");
    dispatchFilter({ type: "RESET" });
    setFocusedIdx(-1);
    setHoveredThreadId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const commitSearch = useCallback(
    (q: string) => {
      const plainQuery    = q.trim() || null;
      // FIX: pass ActiveFilters directly — ui.store.setSearchQuery accepts
      // SearchFilters which now has labels?: string[]. The store type was
      // updated to match; no join needed here.
      const activeFilters = filterCount > 0 ? { ...filters } : null;
      if (!plainQuery && !activeFilters) { close(); return; }
      setSearchQuery(plainQuery ?? " ", activeFilters);
      close();
    },
    [setSearchQuery, filters, filterCount, close],
  );

  const commitSavedSearch = useCallback(
    (saved: SavedSearch) => {
      setSearchQuery(saved.query.searchText || " ", saved.query.filters ?? null);
      close();
    },
    [setSearchQuery, close],
  );

  const openThread = useCallback(
    (threadId: string, q?: string) => {
      if (q) setSearchQuery(q.trim() || null, null);
      setActiveThread(threadId);
      close();
    },
    [setSearchQuery, setActiveThread, close],
  );

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const max  = inProgress ? inlineSuggestions.length - 1 : results.length - 1;
      const next = Math.min(Math.max(focusedIdx + dir, dir === -1 ? -1 : 0), max);
      setFocusedIdx(next);
    },
    [focusedIdx, results.length, inProgress, inlineSuggestions.length],
  );

  const commitInlineSuggestion = useCallback(
    (email: string) => {
      if (!inProgress) return;
      const { prefix } = inProgress;
      const cleaned = input
        .replace(
          /(?:^|\s)(from:|to:)\S*$/i,
          (m, op) => (m.startsWith(" ") ? ` ${op}${email} ` : `${op}${email} `),
        )
        .replace(new RegExp(`(?:^|\\s)${prefix}:${email}(?=\\s|$)`, "gi"), " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      dispatchFilter({
        type:  "PATCH",
        patch: prefix === "from" ? { filterFrom: email } : { filterTo: email },
      });
      setInputRaw(cleaned);
    },
    [inProgress, input],
  );

  return {
    input,            setInput,
    debounced,        hasInput,
    ghostSuffix,
    filters,          setFilters,        filterCount,
    focusedIdx,       setFocusedIdx,
    focusedEmail,
    showPreview,      setShowPreview,
    hoveredThreadId,  setHoveredThreadId,
    results,          total,             isFetching,
    recentSearches,   recentThreads,     savedSearches,
    inProgress,       inlineSuggestions, commitInlineSuggestion,
    showResults:      hasInput || filterCount > 0,
    commitSearch,     commitSavedSearch, openThread, navigate, close,
  };
}