"use client";

import { useReplySuggestionsQuery } from "@/features/ai/ai.query";
import type { ReplySuggestion } from "@/features/ai/ai.type";

export function useSmartReplies(
  threadId: string | undefined,
  emailAddress: string | undefined,
) {
  const { data, isPending, isError } = useReplySuggestionsQuery(
    threadId ?? "",
    emailAddress ?? "",
  );

  return {
    suggestions: (data?.suggestions ?? []) as ReplySuggestion[],
    isLoading: isPending,
    isError,
  };
}
