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
import { toast } from "sonner";
import { mailboxService } from "./mailbox.api";
import {
  GetThreadEmailsResponse,
  LabelActionParams,
  ThreadActionParams,
  ThreadCursor,
  ThreadEmail,
} from "./mailbox.type";
import { useUIStore } from "@/lib/store/ui.store";

// ─── Query keys ───────────────────────────────────────────────────────────────
export const mailboxKeys = {
  all:           ["mailboxes"] as const,
  connected:     () => [...mailboxKeys.all, "connected"] as const,
  threads:       (email?: string) =>
    email
      ? ([...mailboxKeys.all, "threads", email] as const)
      : ([...mailboxKeys.all, "threads"] as const),
  thread:        (threadId: string) =>
    [...mailboxKeys.all, "thread", threadId] as const,
  folders:       (email?: string) =>
    [...mailboxKeys.all, "folders", { email }] as const,
  senderThreads: (senderEmail: string) =>
    [...mailboxKeys.all, "sender", senderEmail] as const,
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function useConnectedAccounts() {
  return useSuspenseQuery({
    queryKey:  mailboxKeys.connected(),
    queryFn:   mailboxService.getConnectedAccounts,
    staleTime: 5  * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
}

// ─── Thread list ──────────────────────────────────────────────────────────────
// Stable selector — defined outside to never cause render loops
function selectThreadData(data: InfiniteData<GetThreadEmailsResponse>) {
  const threads   = data.pages.flatMap((p) => p.data.threads);
  const threadIds = threads.map((t) => t.threadId);
  return { threads, threadIds };
}

export function useThreadEmails(email?: string) {
  return useSuspenseInfiniteQuery({
    queryKey:         mailboxKeys.threads(email),
    queryFn: ({ pageParam }) =>
      mailboxService.getThreadEmails({
        email,
        size:   20,
        cursor: pageParam ? JSON.stringify(pageParam) : undefined,
      }),
    initialPageParam: null as ThreadCursor | null,
    getNextPageParam: (lastPage) =>
      lastPage.success ? (lastPage.data.nextCursor ?? null) : null,
    select:    selectThreadData,
    staleTime: 30 * 1000,
  });
}

// ─── Thread detail ────────────────────────────────────────────────────────────
export function useThreadDetail(threadId: string) {
  return useSuspenseQuery({
    queryKey:  mailboxKeys.thread(threadId),
    queryFn:   () => mailboxService.getThreadDetail(threadId),
    staleTime: 15 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
  });
}

// ─── Sender threads (real API) ────────────────────────────────────────────────
// Non-suspense — loads in background so SenderPane doesn't block rendering
export function useThreadsBySender(senderEmail: string) {
  return useQuery({
    queryKey:  mailboxKeys.senderThreads(senderEmail),
    queryFn:   () => mailboxService.getThreadsBySender(senderEmail),
    enabled:   !!senderEmail,
    staleTime: 2  * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    select:    (data) => data?.data?.threads ?? [],
  });
}

// ─── Folders ──────────────────────────────────────────────────────────────────
export function useFolders(email?: string) {
  return useSuspenseQuery({
    queryKey:  mailboxKeys.folders(email),
    queryFn:   () => mailboxService.getFolders(email),
    staleTime: 60 * 1000,
    gcTime:    5  * 60 * 1000,
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
export const prefetchThreadDetail = (queryClient: QueryClient, threadId: string) =>
  queryClient.prefetchQuery({
    queryKey:  mailboxKeys.thread(threadId),
    queryFn:   () => mailboxService.getThreadDetail(threadId),
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

// ─── Optimistic patch helper ──────────────────────────────────────────────────
function patchThreadInCache(
  queryClient: QueryClient,
  threadsKey: readonly unknown[],
  threadId: string,
  patch: Partial<ThreadEmail>,
) {
  queryClient.setQueryData<InfiniteData<GetThreadEmailsResponse>>(
    threadsKey,
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            threads: page.data.threads.map((t) =>
              t.threadId === threadId ? { ...t, ...patch } : t,
            ),
          },
        })),
      };
    },
  );
}

// ─── Toggle star ──────────────────────────────────────────────────────────────
export function useToggleStar() {
  const queryClient   = useQueryClient();
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadsKey    = mailboxKeys.threads(selectedEmail ?? undefined);

  return useMutation({
    mutationFn: (vars: ThreadActionParams & { isStarred: boolean }) =>
      vars.isStarred
        ? mailboxService.unstarThread(vars)
        : mailboxService.starThread(vars),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: threadsKey });
      const previous = queryClient.getQueryData(threadsKey);
      patchThreadInCache(queryClient, threadsKey, vars.threadId, {
        isStarred: !vars.isStarred,
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(threadsKey, ctx.previous);
      toast.error("Failed to update star");
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.isStarred ? "Unstarred" : "Starred");
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

// ─── Toggle read ──────────────────────────────────────────────────────────────
export function useToggleRead() {
  const queryClient   = useQueryClient();
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadsKey    = mailboxKeys.threads(selectedEmail ?? undefined);

  return useMutation({
    mutationFn: (vars: ThreadActionParams & { isUnread: boolean }) =>
      vars.isUnread
        ? mailboxService.markRead(vars)
        : mailboxService.markUnread(vars),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: threadsKey });
      const previous = queryClient.getQueryData(threadsKey);
      patchThreadInCache(queryClient, threadsKey, vars.threadId, {
        isUnread: !vars.isUnread,
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(threadsKey, ctx.previous);
      toast.error("Failed to update read status");
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.isUnread ? "Marked as read" : "Marked as unread");
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

// ─── Archive ──────────────────────────────────────────────────────────────────
export function useArchiveThread() {
  const queryClient   = useQueryClient();
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadsKey    = mailboxKeys.threads(selectedEmail ?? undefined);

  return useMutation({
    mutationFn: mailboxService.archiveThread,
    onError:    () => toast.error("Failed to archive"),
    onSuccess:  () => {
      toast.success("Archived");
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteThread() {
  const queryClient   = useQueryClient();
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const threadsKey    = mailboxKeys.threads(selectedEmail ?? undefined);

  return useMutation({
    mutationFn: mailboxService.deleteThread,
    onError:    () => toast.error("Failed to delete"),
    onSuccess:  () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

// ─── Labels ───────────────────────────────────────────────────────────────────
export function useAddLabel() {
  return useMutation({
    mutationFn: mailboxService.addLabel,
    onSuccess:  () => toast.success("Label added"),
    onError:    () => toast.error("Failed to add label"),
  });
}

export function useRemoveLabel() {
  return useMutation({
    mutationFn: mailboxService.removeLabel,
    onSuccess:  () => toast.success("Label removed"),
    onError:    () => toast.error("Failed to remove label"),
  });
}