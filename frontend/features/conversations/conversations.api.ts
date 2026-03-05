import { apiClient } from "@/lib/api/client";
import {
  CreateConversationResponse,
  CreateMessagePayload,
  CreateMessageResponse,
  GetConversationsResponse,
  GetMessagesResponse,
} from "./conversations.type";

export const conversationService = {
  createConversation: () =>
    apiClient<CreateConversationResponse>(`/conversations`, {
      method: "POST",
    }),

  createMessage: (
    conversationId: string,
    payload: Pick<CreateMessagePayload, "content">,
  ) =>
    apiClient<CreateMessageResponse>(
      `/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  getConversations: (cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.append("cursor", cursor);
    const qs = params.toString();
    return apiClient<GetConversationsResponse>(
      qs ? `/conversations?${qs}` : `/conversations`,
    );
  },

  getMessages: (conversationId: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.append("cursor", cursor);
    const qs = params.toString();
    return apiClient<GetMessagesResponse>(
      qs
        ? `/conversations/${conversationId}/messages?${qs}`
        : `/conversations/${conversationId}/messages`,
    );
  },
};
