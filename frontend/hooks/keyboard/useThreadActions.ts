"use client";

import { useCallback } from "react";
import { useEmailAction } from "@/features/mailbox/mailbox.query";
import type {
  EmailActionType,
  ThreadEmail,
} from "@/features/mailbox/mailbox.type";

const toProvider = (p?: string): "GOOGLE" | "OUTLOOK" => {
  if (!p) return "GOOGLE";
  const normalized = p.toLowerCase();
  if (normalized === "outlook" || normalized === "microsoft") return "OUTLOOK";
  return "GOOGLE";
};

export function useThreadActions(thread: ThreadEmail, emailAddress: string) {
  const { mutate } = useEmailAction();

  const run = useCallback(
    (action: EmailActionType) =>
      mutate({
        from: emailAddress,
        provider: toProvider(thread.provider),
        messageIds: [thread.lastEmailId],
        action,
      }),
    [mutate, emailAddress, thread.lastEmailId, thread.provider],
  );

  const star = useCallback(
    () => run(thread.isStarred ? "unstar" : "star"),
    [run, thread.isStarred],
  );
  const markRead = useCallback(
    () => run(thread.isUnread ? "mark_read" : "mark_unread"),
    [run, thread.isUnread],
  );
  const archive = useCallback(() => run("archive"), [run]);

  return { star, markRead, archive };
}
