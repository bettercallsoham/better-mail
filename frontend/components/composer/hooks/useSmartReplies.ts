"use client";

import { useQuery } from "@tanstack/react-query";

interface SmartReply {
  id:   string;
  text: string;
}

interface SmartRepliesResponse {
  success:  boolean;
  replies:  SmartReply[];
}

export function useSmartReplies(threadId: string | undefined, enabled = true) {
  return useQuery<SmartReply[]>({
    queryKey: ["smart-replies", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/mail/smart-replies?threadId=${threadId}`);
      if (!res.ok) throw new Error("Failed to fetch smart replies");
      const data: SmartRepliesResponse = await res.json();
      return data.replies ?? [];
    },
    enabled:   !!threadId && enabled,
    staleTime: 5 * 60 * 1000,  // 5 min — smart replies don't change
    gcTime:    10 * 60 * 1000,
    retry:     false,           // don't spam if endpoint is missing
  });
}