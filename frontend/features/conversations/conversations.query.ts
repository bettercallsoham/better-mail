import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { conversationService } from "./conversations.api";
import {
  ConversationMessage,
  CreateMessagePayload,
  GetMessagesResponse,
  GetConversationsResponse,
} from "./conversations.type";
import { useConversationStore } from "@/lib/store/conversations.store";

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  messages: (conversationId: string) =>
    [...conversationKeys.all, "messages", conversationId] as const,
};

export function useConversations() {
  return useInfiniteQuery({
    queryKey: conversationKeys.lists(),
    queryFn: ({ pageParam }) =>
      conversationService.getConversations(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      conversationService.getMessages(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => conversationService.createConversation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

export function useCreateMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const initStream = useConversationStore((s) => s.initStream);

  return useMutation({
    mutationFn: (payload: CreateMessagePayload) =>
      conversationService.createMessage(conversationId, payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: conversationKeys.messages(conversationId),
      });

      const previousMessages =
        queryClient.getQueryData<InfiniteData<GetMessagesResponse>>(
          conversationKeys.messages(conversationId),
        );

      const optimisticUserMessage: ConversationMessage = {
        messageId: `optimistic-${Date.now()}`,
        conversationId,
        userId: "me",
        role: "user",
        content: payload.content,
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<InfiniteData<GetMessagesResponse>>(
        conversationKeys.messages(conversationId),
        (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          const lastPage = pages[pages.length - 1];
          pages[pages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, optimisticUserMessage],
          };
          return { ...old, pages };
        },
      );

      initStream(conversationId);

      return { previousMessages };
    },

    onError: (_err, _payload, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          conversationKeys.messages(conversationId),
          context.previousMessages,
        );
      }
    },
  });
}