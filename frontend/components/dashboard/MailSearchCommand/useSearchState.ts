"use client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import type { SearchEmail, SearchQueryParams } from "@/features/mailbox/mailbox.type";

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

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export function parseQuery(raw: string): SearchQueryParams {
  const parts = raw.trim().split(/\s+/);
  const params: SearchQueryParams = { query: "" };
  const text: string[] = [];
  for (const p of parts) {
    if (p.startsWith("from:"))        params.filterFrom = p.slice(5);
    else if (p.startsWith("to:"))     params.filterTo   = p.slice(3);
    else if (p === "is:unread")       params.isRead     = false;
    else if (p === "is:read")         params.isRead     = true;
    else if (p === "is:starred")      params.isStarred  = true;
    else if (p === "is:archived")     params.isArchived = true;
    else if (p === "has:attachment")  params.hasAttachments = true;
    else text.push(p);
  }
  params.query = text.join(" ");
  return params;
}

/** Build valid SearchQueryParams — never sends empty/undefined query */
function buildSearchParams(
  parsed: SearchQueryParams | null,
  filters: ActiveFilters,
  size = 8,
): SearchQueryParams | null {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
  if (!parsed && !hasFilters) return null;

  const merged: Omit<SearchQueryParams, "query"> & { query?: string } = {
    ...filters,
    size,
  };

  // API requires query — use single space when only filters are set
  const rawQuery = parsed?.query;
  merged.query = (rawQuery && rawQuery.trim()) ? rawQuery.trim() : " ";

  // Merge inline operators from search bar
  if (parsed?.filterFrom && !merged.filterFrom) merged.filterFrom = parsed.filterFrom;
  if (parsed?.filterTo   && !merged.filterTo)   merged.filterTo   = parsed.filterTo;
  if (parsed?.isRead     !== undefined && merged.isRead     === undefined) merged.isRead     = parsed.isRead;
  if (parsed?.isStarred  !== undefined && merged.isStarred  === undefined) merged.isStarred  = parsed.isStarred;
  if (parsed?.isArchived !== undefined && merged.isArchived === undefined) merged.isArchived = parsed.isArchived;
  if (parsed?.hasAttachments !== undefined && merged.hasAttachments === undefined) merged.hasAttachments = parsed.hasAttachments;

  return merged as SearchQueryParams;
}

/** Encode active filters as a query string so the thread list can replay them */
function filtersToQueryString(q: string, filters: ActiveFilters): string {
  const parts: string[] = [];
  if (q.trim()) parts.push(q.trim());
  if (filters.isRead === false)     parts.push("is:unread");
  if (filters.isRead === true)      parts.push("is:read");
  if (filters.isStarred)            parts.push("is:starred");
  if (filters.isArchived)           parts.push("is:archived");
  if (filters.hasAttachments)       parts.push("has:attachment");
  if (filters.filterFrom)           parts.push(`from:${filters.filterFrom}`);
  if (filters.filterTo)             parts.push(`to:${filters.filterTo}`);
  if (filters.labels)               parts.push(`label:${filters.labels}`);
  if (filters.dateFrom)             parts.push(`after:${filters.dateFrom}`);
  return parts.join(" ") || " ";
}

export function useSearchState(open: boolean, onOpenChange: (v: boolean) => void) {
  const [input,        setInput]        = useState("");
  const [filters,      setFilters]      = useState<ActiveFilters>({});
  const [focusedIdx,   setFocusedIdx]   = useState(-1);
  const [focusedEmail, setFocusedEmail] = useState<SearchEmail | null>(null);
  const [showPreview,  setShowPreview]  = useState(true);

  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  const debounced   = useDebounce(input, 280);
  const hasInput    = debounced.trim().length > 0;
  const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;
  const parsed      = hasInput ? parseQuery(debounced) : null;

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

  const searchParams = buildSearchParams(parsed, filters, 8);

  const { data: liveResults, isFetching } = useQuery({
    queryKey: ["search-live", searchParams],
    queryFn:  () => mailboxService.searchEmails(searchParams!),
    enabled:  !!searchParams,
    staleTime: 15_000,
  });

  const results        = liveResults?.emails ?? [];
  const total          = liveResults?.total  ?? 0;
  const recentSearches = recentData?.data?.slice(0, 6)                 ?? [];
  const recentThreads  = recentThreadsData?.data?.threads?.slice(0, 5) ?? [];

  // Track previous values to avoid re-firing the effect when unrelated state changes
  const prevResultsLenRef = useRef(-1);
  const prevDebouncedRef  = useRef("");

  useEffect(() => {
    if (
      prevResultsLenRef.current === results.length &&
      prevDebouncedRef.current  === debounced
    ) return;
    prevResultsLenRef.current = results.length;
    prevDebouncedRef.current  = debounced;
    startTransition(() => {
      setFocusedIdx(-1);
      setFocusedEmail(null);
    });
  });

  const close = useCallback(() => {
    setInput("");
    setFilters({});
    setFocusedEmail(null);
    setFocusedIdx(-1);
    onOpenChange(false);
  }, [onOpenChange]);

  // Enter → commit — serialises both text query AND active filters into the search query string
  const commitSearch = useCallback((q: string) => {
    const serialised = filtersToQueryString(q, filters);
    setSearchQuery(serialised.trim() || null);
    close();
  }, [setSearchQuery, filters, close]);

  // Click thread → open directly
  const openThread = useCallback((threadId: string, q?: string) => {
    if (q) setSearchQuery(q);
    setActiveThread(threadId);
    close();
  }, [setSearchQuery, setActiveThread, close]);

  const navigate = useCallback((dir: 1 | -1) => {
    const next = Math.min(Math.max(focusedIdx + dir, dir === -1 ? -1 : 0), results.length - 1);
    setFocusedIdx(next);
    setFocusedEmail(next >= 0 ? results[next] : null);
  }, [focusedIdx, results]);

  const showResults = hasInput || filterCount > 0;

  return {
    input, setInput,
    filters, setFilters, filterCount,
    focusedIdx, focusedEmail,
    setFocusedIdx, setFocusedEmail,
    showPreview, setShowPreview,
    hasInput, debounced,
    results, total,
    isFetching,
    recentSearches, recentThreads,
    showResults,
    commitSearch, openThread, navigate, close,
  };
}