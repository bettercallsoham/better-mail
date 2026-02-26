"use client";

import {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import type { SearchEmail, SearchQueryParams } from "@/features/mailbox/mailbox.type";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActiveFilters {
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

type FilterAction =
  | { type: "SET"; filters: ActiveFilters }
  | { type: "PATCH"; patch: Partial<ActiveFilters> }
  | { type: "RESET" };

// ─────────────────────────────────────────────────────────────────────────────
// Operator promotion map — defined once at module level
// ─────────────────────────────────────────────────────────────────────────────

const PROMOTABLE_OPERATORS: Array<{
  match: string;
  apply: (f: ActiveFilters) => ActiveFilters;
}> = [
  { match: "is:unread",      apply: (f) => ({ ...f, isRead: false }) },
  { match: "is:read",        apply: (f) => ({ ...f, isRead: true }) },
  { match: "is:starred",     apply: (f) => ({ ...f, isStarred: true }) },
  { match: "is:archived",    apply: (f) => ({ ...f, isArchived: true }) },
  { match: "has:attachment", apply: (f) => ({ ...f, hasAttachments: true }) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — all defined at module level so they're never re-created
// ─────────────────────────────────────────────────────────────────────────────

/** Short-circuit early when no ":" present — avoids regex work on normal typing */
function extractOperators(raw: string): { cleaned: string; delta: ActiveFilters } {
  if (!raw.includes(":")) return { cleaned: raw, delta: {} };

  let cleaned = raw;
  const delta: ActiveFilters = {};

  for (const op of PROMOTABLE_OPERATORS) {
    const re = new RegExp(`(?:^|\\s)${op.match}(?=\\s|$)`, "gi");
    if (re.test(cleaned)) {
      Object.assign(delta, op.apply({}));
      cleaned = cleaned.replace(re, " ").replace(/\s{2,}/g, " ").trim();
    }
  }

  return { cleaned, delta };
}

/** Detect an in-progress `from:xxx` or `to:xxx` token (no trailing space yet) */
function detectInProgressOperator(
  raw: string,
): { prefix: "from" | "to"; partial: string } | null {
  if (!raw.includes(":")) return null;
  const match = raw.match(/(?:^|\s)(from:|to:)(\S*)$/i);
  if (!match) return null;
  return {
    prefix: match[1].replace(":", "").toLowerCase() as "from" | "to",
    partial: match[2],
  };
}

export function parseQuery(raw: string): SearchQueryParams {
  const params: SearchQueryParams = { query: "" };
  const text: string[] = [];

  for (const p of raw.trim().split(/\s+/)) {
    if      (p.startsWith("from:"))       params.filterFrom     = p.slice(5);
    else if (p.startsWith("to:"))         params.filterTo       = p.slice(3);
    else if (p === "is:unread")           params.isRead         = false;
    else if (p === "is:read")             params.isRead         = true;
    else if (p === "is:starred")          params.isStarred      = true;
    else if (p === "is:archived")         params.isArchived     = true;
    else if (p === "has:attachment")      params.hasAttachments = true;
    else text.push(p);
  }

  params.query = text.join(" ");
  return params;
}

function buildSearchParams(
  parsed: SearchQueryParams | null,
  filters: ActiveFilters,
  size = 8,
): SearchQueryParams | null {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
  if (!parsed && !hasFilters) return null;

  const merged: SearchQueryParams = {
    ...filters,
    size,
    query: parsed?.query?.trim() || " ",
  };

  // Only copy parsed fields when not already set by chip filters
  if (parsed?.filterFrom     && !merged.filterFrom)     merged.filterFrom     = parsed.filterFrom;
  if (parsed?.filterTo       && !merged.filterTo)       merged.filterTo       = parsed.filterTo;
  if (parsed?.isRead         !== undefined && merged.isRead         === undefined) merged.isRead         = parsed.isRead;
  if (parsed?.isStarred      !== undefined && merged.isStarred      === undefined) merged.isStarred      = parsed.isStarred;
  if (parsed?.isArchived     !== undefined && merged.isArchived     === undefined) merged.isArchived     = parsed.isArchived;
  if (parsed?.hasAttachments !== undefined && merged.hasAttachments === undefined) merged.hasAttachments = parsed.hasAttachments;

  return merged;
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
  const [input,        setInputRaw]    = useState("");
  const [filters,      dispatchFilter] = useReducer(filtersReducer, {});
  const [focusedIdx,   setFocusedIdx]  = useState(-1);
  const [showPreview,  setShowPreview] = useState(true);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);

  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  // Stable filter setter — resets focus so the highlighted row doesn't "stick"
  const setFilters = useCallback((f: ActiveFilters) => {
    dispatchFilter({ type: "SET", filters: f });
    setFocusedIdx(-1);
  }, []);

  // Smart input setter — auto-promotes complete operator tokens, resets focus
  const setInput = useCallback((raw: string) => {
    setFocusedIdx(-1);
    if (!raw.includes(":")) {
      setInputRaw(raw);
      return;
    }
    const { cleaned, delta } = extractOperators(raw);
    if (Object.keys(delta).length > 0) {
      dispatchFilter({ type: "PATCH", patch: delta });
      setInputRaw(cleaned);
    } else {
      setInputRaw(raw);
    }
  }, []);

  const debounced = useDebounce(input, 280);

  // Memoized derived values — only recompute when their inputs change
  const hasInput    = useMemo(() => debounced.trim().length > 0,          [debounced]);
  const filterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== "").length,
    [filters],
  );
  const parsed      = useMemo(() => (hasInput ? parseQuery(debounced) : null), [hasInput, debounced]);
  const inProgress  = useMemo(() => detectInProgressOperator(input), [input]);
  const searchParams = useMemo(
    () => (inProgress ? null : buildSearchParams(parsed, filters, 8)),
    [inProgress, parsed, filters],
  );

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

  const suggestPartial = inProgress?.prefix === "from"
    ? inProgress.partial
    : inProgress?.prefix === "to"
    ? inProgress.partial
    : undefined;

  const { data: inlineSuggestData } = useQuery({
    queryKey: mailboxKeys.suggestions({ query: suggestPartial, limit: 6 }),
    queryFn:  () => mailboxService.getEmailSuggestions(suggestPartial || undefined, 6),
    staleTime: 30_000,
    enabled:  !!inProgress,
  });

  const { data: liveResults, isFetching } = useQuery({
    queryKey: ["search-live", searchParams],
    queryFn:  () => mailboxService.searchEmails(searchParams!),
    enabled:  !!searchParams,
    staleTime: 15_000,
  });

  // ── Derived list data ──────────────────────────────────────────────────────

  const results        = liveResults?.emails         ?? [];
  const total          = liveResults?.total          ?? 0;
  const recentSearches = recentData?.data?.slice(0, 6)                  ?? [];
  const recentThreads  = recentThreadsData?.data?.threads?.slice(0, 5)  ?? [];
  const inlineSuggestions = inProgress ? (inlineSuggestData?.data?.suggestions ?? []) : [];

  // focusedEmail is fully derived — no state, no effect, no cascade
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

  const commitSearch = useCallback((q: string) => {
    const plainQuery    = q.trim() || null;
    const activeFilters = filterCount > 0 ? { ...filters } : null;

    if (!plainQuery && !activeFilters) { close(); return; }

    // When filter-only (no text), store " " so the API never receives empty string
    setSearchQuery(plainQuery ?? " ", activeFilters);
    close();
  }, [setSearchQuery, filters, filterCount, close]);

  const openThread = useCallback((threadId: string, q?: string) => {
    if (q) setSearchQuery(q.trim() || null, null);
    setActiveThread(threadId);
    close();
  }, [setSearchQuery, setActiveThread, close]);

  const navigate = useCallback((dir: 1 | -1) => {
    const max = inProgress ? inlineSuggestions.length - 1 : results.length - 1;
    const next = Math.min(Math.max(focusedIdx + dir, dir === -1 ? -1 : 0), max);
    setFocusedIdx(next);
  }, [focusedIdx, results.length, inProgress, inlineSuggestions.length]);

  const commitInlineSuggestion = useCallback((email: string) => {
    if (!inProgress) return;
    const { prefix } = inProgress;

    const cleaned = input
      .replace(/(?:^|\s)(from:|to:)\S*$/i, (m, op) =>
        m.startsWith(" ") ? ` ${op}${email} ` : `${op}${email} `,
      )
      .replace(new RegExp(`(?:^|\\s)${prefix}:${email}(?=\\s|$)`, "gi"), " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    dispatchFilter({
      type: "PATCH",
      patch: prefix === "from" ? { filterFrom: email } : { filterTo: email },
    });
    setInputRaw(cleaned);
  }, [inProgress, input]);

  return {
    // Input
    input, setInput,
    debounced, hasInput,
    // Filters
    filters, setFilters, filterCount,
    // Focus / preview
    focusedIdx, setFocusedIdx,
    focusedEmail,               // derived — read-only, no setter needed
    showPreview, setShowPreview,
    hoveredThreadId, setHoveredThreadId,
    // Results
    results, total, isFetching,
    // Recent
    recentSearches, recentThreads,
    // Inline suggestions
    inProgress, inlineSuggestions, commitInlineSuggestion,
    // Computed
    showResults: hasInput || filterCount > 0,
    // Actions
    commitSearch, openThread, navigate, close,
  };
}