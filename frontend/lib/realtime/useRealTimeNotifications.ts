"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/realtime/pusherClient";
import { useQueryClient } from "@tanstack/react-query";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { toast } from "sonner";

export function useRealtimeNotifications(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    const channelName = `private-user-${userId}-notifications`;

    console.log("📡 Subscribing to", channelName);
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("✅ Subscription succeeded");
    });

    channel.bind("pusher:subscription_error", (err: any) => {
      console.error("❌ Subscription error", err);
    });

    channel.bind(
      "mail.received",
      (data: {
        messages: { id: string; threadId: string; snippet: string }[];
        total: number;
      }) => {
        console.log("📬 mail.received", data);

        toast.success(
          `${data.total} new email${data.total > 1 ? "s" : ""} received`,
          {
            description: data.messages[0]?.snippet
              ? data.messages[0].snippet.slice(0, 80) + "..."
              : "You have new mail",
          },
        );

        queryClient.invalidateQueries({ queryKey: mailboxKeys.threads() });
        queryClient.invalidateQueries({ queryKey: mailboxKeys.inboxZero() });
      },
    );

    return () => {
      console.log("🔌 Unsubscribing from", channelName);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [userId]);
}
