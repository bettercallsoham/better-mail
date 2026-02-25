"use client";

import { useEffect } from "react";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/realtime/pusherClient";
import { useConversationStore } from "@/lib/store/conversations.store";
import { conversationKeys } from "@/features/conversations/conversations.query";
import { toast } from "sonner";
import type {
  AITokenEvent,
  AITitleGeneratedEvent,
  AIToolStartEvent,
  AIActionRequiredEvent,
  AICompleteEvent,
  AIErrorEvent,
  GetConversationsResponse,
} from "./conversations.type";

export function useConversationRealtime(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { appendToken, setToolInProgress, completeStream, setPendingAction } =
    useConversationStore();

  useEffect(() => {
    if (!conversationId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-${conversationId}`);

    channel.bind("pusher:subscription_error", (err: Error) => {
      console.error("❌ Conversation channel error", err);
    });

    channel.bind("ai.token", ({ token }: AITokenEvent) => {
      appendToken(conversationId, token);
    });

    channel.bind("ai.tool.start", ({ tool }: AIToolStartEvent) => {
      setToolInProgress(conversationId, tool);
    });

    channel.bind("ai.action.required", (data: AIActionRequiredEvent) => {
      setToolInProgress(conversationId, null);
      setPendingAction({
        conversationId,
        actionId: data.actionId,
        description: data.description,
        items: data.items,
      });
    });

    channel.bind("ai.title.generated", ({ title }: AITitleGeneratedEvent) => {
      queryClient.setQueryData<InfiniteData<GetConversationsResponse>>(
        conversationKeys.lists(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              summaries: page.summaries.map((s) =>
                s.conversationId === conversationId ? { ...s, title } : s,
              ),
            })),
          };
        },
      );
    });

    channel.bind("ai.complete", (_data: AICompleteEvent) => {
      completeStream(conversationId);
      setToolInProgress(conversationId, null);
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(conversationId),
      });
    });

    channel.bind("ai.error", ({ error }: AIErrorEvent) => {
      completeStream(conversationId);
      toast.error("Something went wrong", { description: error });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-${conversationId}`);
    };
  }, [conversationId]);
}