import { apiClient } from "../../lib/api/client";
import {
  GetThreadSummaryParams,
  GetThreadSummaryResponse,
  SuggestReplyParams,
  SuggestReplyResponse,
  SuggestEmailParams,
  SuggestEmailResponse,
} from "./ai.type";

export const aiService = {
  summarizeThread: ({ threadId, emailAddress }: GetThreadSummaryParams) =>
    apiClient<GetThreadSummaryResponse>(`/ai/threads/${threadId}/summarize`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  suggestReply: ({ threadId, emailAddress }: SuggestReplyParams) =>
    apiClient<SuggestReplyResponse>(`/ai/threads/${threadId}/suggest-reply`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  suggestEmail: (params: SuggestEmailParams) =>
    apiClient<SuggestEmailResponse>("/ai/suggest-email", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
