"use client";

import { useCallback } from "react";
import { useEmailAction } from "@/features/mailbox/mailbox.query";
import type { ThreadEmail } from "@/features/mailbox/mailbox.type";

const toProvider = (p: ThreadEmail["provider"]): "GOOGLE" | "OUTLOOK" =>
  p === "outlook" ? "OUTLOOK" : "GOOGLE";

export type ThreadActions = {
  star:           () => void;
  markRead:       () => void;
  archiveToggle:  () => void;
  isArchived:     boolean;
};

export function useThreadActions(thread: ThreadEmail): ThreadActions {
  const { mutate } = useEmailAction();

  const act = useCallback(
    (action: Parameters<typeof mutate>[0]["action"]) =>
      mutate({
        from:       thread.emailAddress,
        provider:   toProvider(thread.provider),
        messageIds: [thread.lastMessageId],
        action,
      }),
    [mutate, thread.emailAddress, thread.lastMessageId, thread.provider],
  );

  const star = useCallback(
    () => act(thread.isStarred ? "unstar" : "star"),
    [act, thread.isStarred],
  );

  const markRead = useCallback(
    () => act(thread.isUnread ? "mark_read" : "mark_unread"),
    [act, thread.isUnread],
  );

  const archiveToggle = useCallback(
    () => act(thread.isArchived ? "unarchive" : "archive"),
    [act, thread.isArchived],
  );

  return { star, markRead, archiveToggle, isArchived: thread.isArchived };
}