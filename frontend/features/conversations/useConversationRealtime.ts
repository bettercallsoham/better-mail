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
  AIToolResultEvent,
  AIActionRequiredEvent,
  AICompleteEvent,
  AIErrorEvent,
  GetConversationsResponse,
} from "./conversations.type";

export function useConversationRealtime(conversationId: string | null) {
  const queryClient = useQueryClient();
  const {
    initStream,
    appendToken,
    setToolInProgress,
    addSources,
    completeStream,
    setPendingAction,
  } = useConversationStore();

  useEffect(() => {
    if (!conversationId) return;

    console.log("[Realtime] useEffect mounting — subscribing to channel:", `private-${conversationId}`);

    const pusher = getPusherClient();
    console.log("[Realtime] Pusher connection state:", pusher.connection.state);

    const channel = pusher.subscribe(`private-${conversationId}`);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("[Realtime] ✅ Successfully subscribed to", `private-${conversationId}`);
    });

    channel.bind("pusher:subscription_error", (err: Error) => {
      console.error("[Realtime] ❌ Subscription ERROR for", `private-${conversationId}`, err);
    });

    channel.bind("ai.token", ({ token }: AITokenEvent) => {
      if (!useConversationStore.getState().streamingMessages[conversationId]) {
        initStream(conversationId);
      }
      console.log("[Realtime] ai.token received", token);
      appendToken(conversationId, token);
    });

    channel.bind("ai.tool.start", ({ tool }: AIToolStartEvent) => {
      if (!useConversationStore.getState().streamingMessages[conversationId]) {
        initStream(conversationId);
      }
      console.log("[Realtime] ai.tool.start received", tool);
      setToolInProgress(conversationId, tool);
    });

    channel.bind("ai.tool.result", ({ data }: AIToolResultEvent) => {
      console.log("[Realtime] ai.tool.result received", data);
      if (data.sources?.length) {
        addSources(conversationId, data.sources);
      }
    });

    channel.bind("ai.action.required", (data: AIActionRequiredEvent) => {
      console.log("[Realtime] ai.action.required received", data);
      setToolInProgress(conversationId, null);
      setPendingAction({
        conversationId,
        actionId: data.actionId,
        description: data.description,
        items: data.items,
      });
    });

    channel.bind("ai.title.generated", ({ title }: AITitleGeneratedEvent) => {
      console.log("[Realtime] ai.title.generated received", title);
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

    channel.bind("ai.complete", async (_data: AICompleteEvent) => {
      console.log("[Realtime] ai.complete received", _data);
      setToolInProgress(conversationId, null);
      await queryClient.refetchQueries({
        queryKey: conversationKeys.messages(conversationId),
      });
      completeStream(conversationId);
    });

    channel.bind("ai.error", ({ error }: AIErrorEvent) => {
      console.error("[Realtime] ai.error received", error);
      completeStream(conversationId);
      toast.error("Something went wrong", { description: error });
    });

    return () => {
      console.log("[Realtime] Cleaning up channel:", `private-${conversationId}`);
      channel.unbind_all();
      pusher.unsubscribe(`private-${conversationId}`);
    };
  }, [conversationId]);
}
