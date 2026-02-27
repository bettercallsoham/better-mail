"use client";

import { useCallback } from "react";
import { useEmailAction } from "@/features/mailbox/mailbox.query";
import type { ThreadEmail } from "@/features/mailbox/mailbox.type";

const toProvider = (p: ThreadEmail["provider"]): "GOOGLE" | "OUTLOOK" =>
  p === "outlook" ? "OUTLOOK" : "GOOGLE";

export type ThreadActions = {
  star:     () => void;
  markRead: () => void;
  archive:  () => void;
};

export function useThreadActions(thread: ThreadEmail): ThreadActions {
  const { mutate } = useEmailAction();

  const star = useCallback(() =>
    mutate({
      from:       thread.emailAddress,
      provider:   toProvider(thread.provider),
      messageIds: [thread.lastMessageId],
      action:     thread.isStarred ? "unstar" : "star",
    }),
    [mutate, thread.emailAddress, thread.lastMessageId, thread.provider, thread.isStarred],
  );

  const markRead = useCallback(() =>
    mutate({
      from:       thread.emailAddress,
      provider:   toProvider(thread.provider),
      messageIds: [thread.lastMessageId],
      action:     thread.isUnread ? "mark_read" : "mark_unread",
    }),
    [mutate, thread.emailAddress, thread.lastMessageId, thread.provider, thread.isUnread],
  );

  const archive = useCallback(() =>
    mutate({
      from:       thread.emailAddress,
      provider:   toProvider(thread.provider),
      messageIds: [thread.lastMessageId],
      action:     "archive",
    }),
    [mutate, thread.emailAddress, thread.lastMessageId, thread.provider],
  );

  return { star, markRead, archive };
}