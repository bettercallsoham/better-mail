import { useMutation, useQuery } from "@tanstack/react-query";
import { aiService } from "./ai.api";
import { useUIStore } from "@/lib/store/ui.store";
import { SuggestEmailParams, SuggestReplyParams } from "./ai.type";

export const aiKeys = {
  all: ["ai"] as const,
  summary: (threadId: string, emailAddress: string) =>
    [...aiKeys.all, "summary", threadId, emailAddress] as const,
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

export function useReplySuggestions() {
  return useMutation({
    mutationFn: (params: SuggestReplyParams) => aiService.suggestReply(params),
  });
}

export function useSuggestEmail() {
  return useMutation({
    mutationFn: (params: SuggestEmailParams) => aiService.suggestEmail(params),
  });
}
