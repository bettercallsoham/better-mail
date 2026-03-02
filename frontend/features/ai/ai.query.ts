import { useMutation, useQuery } from "@tanstack/react-query";
import { aiService } from "./ai.api";
import { useUIStore } from "@/lib/store/ui.store";
import { SuggestEmailParams, SuggestReplyParams } from "./ai.type";

export const aiKeys = {
  all: ["ai"] as const,
  summary: (threadId: string, emailAddress: string) =>
    [...aiKeys.all, "summary", threadId, emailAddress] as const,
  replies: (threadId: string, emailAddress: string) =>
    [...aiKeys.all, "replies", threadId, emailAddress] as const,
};

export function useThreadSummary(threadId: string, fallbackEmail: string) {
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const emailAddress = selectedEmail ?? fallbackEmail;

  return useQuery({
    queryKey: aiKeys.summary(threadId, emailAddress),
    queryFn: () => aiService.summarizeThread({ threadId, emailAddress }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useReplySuggestionsQuery(threadId: string, emailAddress: string) {
  return useQuery({
    queryKey: aiKeys.replies(threadId, emailAddress),
    queryFn: () => aiService.suggestReply({ threadId, emailAddress }),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    enabled: !!threadId && !!emailAddress,
  });
}



export function useSuggestEmail() {
  return useMutation({
    mutationFn: (params: SuggestEmailParams) => aiService.suggestEmail(params),
  });
}
