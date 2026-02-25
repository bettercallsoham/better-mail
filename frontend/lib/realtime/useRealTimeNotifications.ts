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

    const channel = pusher.subscribe(channelName);

    // 
    channel.bind("mail.received", (data: any) => {
      toast.success("New email received", {
        description: `${data.total} new email(s) in ${data.email}`,
      });

      // 🔥 2. Invalidate queries
      queryClient.invalidateQueries({
        queryKey: mailboxKeys.threads(),
      });

      queryClient.invalidateQueries({
        queryKey: mailboxKeys.inboxZero(),
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [userId]);
}
