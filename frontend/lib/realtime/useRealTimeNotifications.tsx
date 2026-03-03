"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/realtime/pusherClient";
import { useQueryClient } from "@tanstack/react-query";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";

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

        const count = data.total;
        const snippet = data.messages[0]?.snippet?.slice(0, 80) ?? "";

        toast.success(count === 1 ? "New email" : `${count} new emails`, {
          description: snippet || "Check your inbox",
          icon: (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 shrink-0">
              <MailIcon
                size={14}
                className="text-blue-500 dark:text-blue-400"
              />
            </span>
          ),
          duration: 5000,
          closeButton: true,
        });

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
