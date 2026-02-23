import {
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { mailboxService } from "./mailbox.api";
import { ThreadCursor } from "./mailbox.type";
import { useMutation } from "@tanstack/react-query";

export const mailboxKeys = {
  all: ["mailboxes"] as const,
  connected: () => [...mailboxKeys.all, "connected"] as const,
  threads: (email?: string) =>
    email
      ? [...mailboxKeys.all, "threads", email]
      : ([...mailboxKeys.all, "threads"] as const),
  thread: (threadId: string) =>
    [...mailboxKeys.all, "thread", threadId] as const,
  folders: (email?: string) =>
    [...mailboxKeys.all, "folders", { email }] as const,
};

export function useConnectedAccounts() {
  return useSuspenseQuery({
    queryKey: mailboxKeys.connected(),
    queryFn: mailboxService.getConnectedAccounts,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useThreadEmails(email?: string) {
  return useSuspenseInfiniteQuery({
    queryKey: email
      ? mailboxKeys.threads(email)
      : ["mailboxes", "threads", "disabled"],

    queryFn: ({ pageParam }) =>
      mailboxService.getThreadEmails({
        email: email!,
        size: 20,
        cursor: pageParam ? JSON.stringify(pageParam) : undefined,
      }),

    initialPageParam: null as ThreadCursor | null,

    getNextPageParam: (lastPage) =>
      lastPage.success ? (lastPage.data.nextCursor ?? undefined) : undefined,

    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useThreadDetail(threadId: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.thread(threadId),
    queryFn: () => mailboxService.getThreadDetail(threadId),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useFolders(email?: string) {
  return useSuspenseQuery({
    queryKey: mailboxKeys.folders(email),
    queryFn: () => mailboxService.getFolders(email),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useConnectAccount() {
  return useMutation({
    mutationFn: async (provider: "gmail" | "outlook") => {
      const response =
        provider === "gmail"
          ? await mailboxService.connectGmail()
          : await mailboxService.connectOutlook();

      return response;
    },
    onSuccess: (data) => {
      console.log(data);
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}
