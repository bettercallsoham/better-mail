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
  CreateDraftParams,
  CreateSavedSearchParams,
  EmailActionParams,
  EmailActionType,
  GetThreadEmailsResponse,
  InboxZeroParams,
  ReplyEmailParams,
  SearchQueryParams,
  SendEmailParams,
  ThreadEmail,
  UpdateDraftParams,
  UpdateInboxStateParams,
  UpdateSavedSearchParams,
  UpsertThreadNoteParams,
} from "./mailbox.type";
import { toast } from "sonner";

type RawThreadPage = {
  success: boolean;
  data: {
    threads: ThreadEmail[];
    nextPage: number | null;
  };
};

type RawThreadCache = {
  pages: RawThreadPage[];
  pageParams: unknown[];
};

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

  suggestions: (params?: { query?: string; limit?: number }) =>
    [...mailboxKeys.all, "suggestions", params] as const,

  recentSearches: () => [...mailboxKeys.all, "recent-searches"] as const,

  savedSearches: () => [...mailboxKeys.all, "saved-searches"] as const,

  threadNote: (threadId: string) =>
    [...mailboxKeys.all, "thread-note", threadId] as const,

  inboxZero: (params?: InboxZeroParams) =>
    [...mailboxKeys.all, "inbox-zero", params] as const,

  savedSearch: (id: string) =>
    [...mailboxKeys.all, "saved-search", id] as const,
  draft: (id: string) => [...mailboxKeys.all, "draft", id] as const,
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


import type { SavedSearch } from "./mailbox.type";

type SavedSearchCache = { success: boolean; data: SavedSearch[] };

// ── 1. CREATE — no optimistic, just fast invalidation ────────────────────────

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateSavedSearchParams) =>
      mailboxService.createSavedSearch(params),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.savedSearches() });
    },

    onError: () => {
      toast.error("Failed to save filter", {
        description: "Please try again.",
        duration: 4000,
      });
    },
  });
}

// ── 2. UPDATE — optimistic: patch real cache data in place ───────────────────

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateSavedSearchParams) =>
      mailboxService.updateSavedSearch(params),

    onMutate: async (params) => {
      // Cancel any in-flight refetches so they don't overwrite our patch
      await queryClient.cancelQueries({ queryKey: mailboxKeys.savedSearches() });
      await queryClient.cancelQueries({
        queryKey: mailboxKeys.savedSearch(params.id),
      });

      // Snapshot before mutation
      const previous = queryClient.getQueryData<SavedSearchCache>(
        mailboxKeys.savedSearches(),
      );

      // Apply only the fields that were actually provided — no stubs
      queryClient.setQueryData<SavedSearchCache>(
        mailboxKeys.savedSearches(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((s) =>
              s.id !== params.id
                ? s
                : {
                    ...s,
                    ...(params.name  !== undefined && { name:  params.name  }),
                    ...(params.color !== undefined && { color: params.color }),
                    ...(params.query !== undefined && { query: params.query }),
                  },
            ),
          };
        },
      );

      return { previous };
    },

    onError: (_err, _params, context) => {
      // Rollback to snapshot
      if (context?.previous) {
        queryClient.setQueryData(mailboxKeys.savedSearches(), context.previous);
      }
      toast.error("Failed to update filter", {
        description: "Changes reverted. Please try again.",
        duration: 4000,
      });
    },

    onSettled: (_data, _err, params) => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.savedSearches() });
      queryClient.invalidateQueries({
        queryKey: mailboxKeys.savedSearch(params.id),
      });
    },
  });
}

// ── 3. DELETE — optimistic: remove from cache immediately ────────────────────

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mailboxService.deleteSavedSearch(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: mailboxKeys.savedSearches() });

      // Snapshot before removal
      const previous = queryClient.getQueryData<SavedSearchCache>(
        mailboxKeys.savedSearches(),
      );

      // Remove the item immediately
      queryClient.setQueryData<SavedSearchCache>(
        mailboxKeys.savedSearches(),
        (old) =>
          old
            ? { ...old, data: old.data.filter((s) => s.id !== id) }
            : old,
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      // Re-insert by rolling back to snapshot
      if (context?.previous) {
        queryClient.setQueryData(mailboxKeys.savedSearches(), context.previous);
      }
      toast.error("Failed to remove filter", {
        description: "Changes reverted. Please try again.",
        duration: 4000,
      });
    },

    onSettled: () => {
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

    onSuccess: (response, { threadId }) => {
   
      queryClient.setQueryData(mailboxKeys.threadNote(threadId), {
        success: true,
        data:    response.data,
      });
    },

    onError: () => {
      toast.error("Failed to save note", {
        description: "Please try again.",
        duration: 4000,
      });
    },
  });
}


export function useInboxZero(params?: InboxZeroParams) {
  return useSuspenseInfiniteQuery({
    queryKey: mailboxKeys.inboxZero(params),
    queryFn: ({ pageParam }) =>
      mailboxService.getInboxZero({ ...params, cursor: pageParam as string }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    staleTime: 30 * 1000,
  });
}

export function useUpdateInboxState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UpdateInboxStateParams) =>
      mailboxService.updateInboxState(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.inboxZero() });
    },
  });
}

export function useDraft(id: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.draft(id),
    queryFn: () => mailboxService.getDraftById(id),
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useCreateDraft() {
  return useMutation({
    mutationFn: (params: CreateDraftParams) =>
      mailboxService.createDraft(params),
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDraftParams) =>
      mailboxService.updateDraft(id, payload),

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: mailboxKeys.draft(id),
      });
    },
  });
}

export function useSendDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => mailboxService.sendDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.all });
    },
  });
}

export function useDeleteDraft() {
  return useMutation({
    mutationFn: (draftId: string) => mailboxService.deleteDraft(draftId),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (params: SendEmailParams) => mailboxService.sendEmail(params),
  });
}

export function useReplyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ReplyEmailParams) => mailboxService.replyEmail(params),
    onSuccess: (_, { replyToMessageId }) => {
      queryClient.invalidateQueries({ queryKey: mailboxKeys.all });
    },
  });
}

export function useEmailAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: EmailActionParams) =>
      mailboxService.emailAction(params),

    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["threads"], exact: false });

      const applyToThread = (thread: ThreadEmail): ThreadEmail | null => {
        if (!params.messageIds.includes(thread.lastMessageId)) return thread;
        switch (params.action) {
          case "star":
            return { ...thread, isStarred: true };
          case "unstar":
            return { ...thread, isStarred: false };
          case "mark_read":
            return { ...thread, isUnread: false };
          case "mark_unread":
            return { ...thread, isUnread: true };
          case "archive":
          case "delete":
            return null;
          case "unarchive":
            return { ...thread, isArchived: false }; // ✅ was missing
          default:
            return thread;
        }
      };

      const prevThreads = queryClient.getQueriesData<RawThreadCache>({
        queryKey: ["threads"],
        exact: false,
      });

      queryClient.setQueriesData<RawThreadCache>(
        { queryKey: ["threads"], exact: false },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: {
                ...page.data,
                threads: page.data.threads
                  .map(applyToThread)
                  .filter((t): t is ThreadEmail => t !== null),
              },
            })),
          };
        },
      );

      return { prevThreads };
    },

    onError: (_err, params, context) => {
      // Roll back optimistic patch
      context?.prevThreads?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );

      const labels: Record<EmailActionType, string> = {
        star: "star",
        unstar: "unstar",
        mark_read: "mark as read",
        mark_unread: "mark as unread",
        archive: "archive",
        unarchive: "unarchive",
        delete: "delete",
      };

      toast.error(`Failed to ${labels[params.action]}`, {
        description: "Changes reverted. Please try again.",
        duration: 4000,
      });
    },

    onSettled: () => {
      // Resync from server after mutation settles
      queryClient.invalidateQueries({ queryKey: ["threads"], exact: false });
    },
  });
}
export function useExecuteSavedSearch(id: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.savedSearch(id),
    queryFn: () => mailboxService.executeSavedSearch(id),
    staleTime: 30 * 1000,
    select: (data) => data.data,
  });
}



export function useEmailSuggestions(query?: string, limit = 10) {
  return useQuery({
    queryKey: mailboxKeys.suggestions({ query, limit }),

    queryFn: () => mailboxService.getEmailSuggestions(query, limit),

    enabled: !!query && query.trim().length > 1,

    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,

    select: (data) => data.data.suggestions,
  });
}
