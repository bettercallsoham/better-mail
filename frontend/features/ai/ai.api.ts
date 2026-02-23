import { apiClient } from "../../lib/api/client";
import { GetThreadSummaryParams, GetThreadSummaryResponse } from "./ai.type";

export const aiService = {
  summarizeThread: ({ threadId, emailAddress }: GetThreadSummaryParams) =>
    apiClient<GetThreadSummaryResponse>(`/ai/threads/${threadId}/summarize`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),
};