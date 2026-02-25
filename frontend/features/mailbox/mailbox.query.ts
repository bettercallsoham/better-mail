"use client";

import {
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { mailboxService } from "./mailbox.api";
import {
  CreateSavedSearchParams,
  GetThreadEmailsResponse,
  SearchQueryParams,
  UpsertThreadNoteParams,
} from "./mailbox.type";

// ─── Query keys ───────────────────────────────────────────────────────────────
export const mailboxKeys = {
  all: ["mailboxes"] as const,
  connected: () => [...mailboxKeys.all, "connected"] as const,
  threads: (email?: string, folder?: string) =>
    ["threads", email, folder] as const,
  thread: (threadId: string) =>
    [...mailboxKeys.all, "thread", threadId] as const,
  folders: (email?: string) =>
    [...mailboxKeys.all, "folders", { email }] as const,
  senderThreads: (senderEmail: string) =>
    [...mailboxKeys.all, "sender", senderEmail] as const,
  search: (params: SearchQueryParams) =>
    [...mailboxKeys.all, "search", params] as const,
  recentSearches: () => [...mailboxKeys.all, "recent-searches"] as const,
  savedSearches: () => [...mailboxKeys.all, "saved-searches"] as const,
  threadNote: (threadId: string) =>
    [...mailboxKeys.all, "thread-note", threadId] as const,
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function useConnectedAccounts() {
  return useSuspenseQuery({
    queryKey: mailboxKeys.connected(),
    queryFn: mailboxService.getConnectedAccounts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function selectThreadData(data: InfiniteData<GetThreadEmailsResponse>) {
  const threads = data.pages.flatMap((p) => p.data.threads);
  const threadIds = threads.map((t) => t.threadId);
  return { threads, threadIds };
}

export function useThreadEmails(email?: string, folder: string = "inbox") {
  return useSuspenseInfiniteQuery({
    queryKey: mailboxKeys.threads(email, folder), // folder in cache key
    queryFn: ({ pageParam }) =>
      mailboxService.getThreadEmails({
        email,
        size: 20,
        page: pageParam,
        folder,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.success ? (lastPage.data.nextPage ?? null) : null,
    select: selectThreadData,
    staleTime: 30 * 1000,
  });
}

// ─── Thread detail ────────────────────────────────────────────────────────────
export function useThreadDetail(threadId: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.thread(threadId),
    queryFn: () => mailboxService.getThreadDetail(threadId),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Sender threads (real API) ────────────────────────────────────────────────
// Non-suspense — loads in background so SenderPane doesn't block rendering
export function useThreadsBySender(senderEmail: string) {
  return useQuery({
    queryKey: mailboxKeys.senderThreads(senderEmail),
    queryFn: () => mailboxService.getThreadsBySender(senderEmail),
    enabled: !!senderEmail,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (data) => data?.data?.threads ?? [],
  });
}

// ─── Folders ──────────────────────────────────────────────────────────────────
export function useFolders(email?: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.folders(email),
    queryFn: () => mailboxService.getFolders(email),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Connect ──────────────────────────────────────────────────────────────────
export function useConnectAccount() {
  return useMutation({
    mutationFn: (provider: "gmail" | "outlook") =>
      provider === "gmail"
        ? mailboxService.connectGmail()
        : mailboxService.connectOutlook(),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });
}

// ─── Prefetch ─────────────────────────────────────────────────────────────────
export const prefetchThreadDetail = (
  queryClient: QueryClient,
  threadId: string,
) =>
  queryClient.prefetchQuery({
    queryKey: mailboxKeys.thread(threadId),
    queryFn: () => mailboxService.getThreadDetail(threadId),
    staleTime: 15 * 60 * 1000,
  });

export function useMailboxPrefetch() {
  const queryClient = useQueryClient();
  return {
    prefetchThread: useCallback(
      (threadId: string) => prefetchThreadDetail(queryClient, threadId),
      [queryClient],
    ),
  };
}

export function useSearchEmails(params: SearchQueryParams) {
  return useSuspenseInfiniteQuery({
    queryKey: mailboxKeys.search(params),
    queryFn: ({ pageParam }) =>
      mailboxService.searchEmails({ ...params, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.success ? (lastPage.nextPage ?? null) : null,
    staleTime: 30 * 1000,
  });
}

export function useRecentSearches() {
  return useSuspenseQuery({
    queryKey: mailboxKeys.recentSearches(),
    queryFn: mailboxService.getRecentSearches,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });
}

export function useSavedSearches() {
  return useSuspenseQuery({
    queryKey: mailboxKeys.savedSearches(),
    queryFn: mailboxService.getSavedSearches,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (data) => data.data,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateSavedSearchParams) =>
      mailboxService.createSavedSearch(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.savedSearches() });
    },
  });
}

export function useThreadNote(threadId: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.threadNote(threadId),
    queryFn: () => mailboxService.getThreadNote(threadId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    select: (data) => data.data,
  });
}

export function useUpsertThreadNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UpsertThreadNoteParams) =>
      mailboxService.upsertThreadNote(params),
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({
        queryKey: mailboxKeys.threadNote(threadId),
      });
    },
  });
}
