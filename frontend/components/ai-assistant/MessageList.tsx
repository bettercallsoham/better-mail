"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/features/conversations/conversations.query";
import { useConversationStore } from "@/lib/store/conversations.store";
import { MessageBubble } from "./MessageBubble";
import { StreamingBubble } from "./StreamingBubble";

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { data, isLoading } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isStreaming = useConversationStore(
    (s) => s.streamingMessages[conversationId]?.isStreaming ?? false,
  );
  const streamingContent = useConversationStore(
    (s) => s.streamingMessages[conversationId]?.content ?? "",
  );

  // Auto-scroll to bottom on new messages or streaming tokens.
  // Use a ref to hold the "last content length" to avoid scheduling
  // a setState on every token (rerender-use-ref-transient-values).
  const lastLengthRef = useRef(0);
  useEffect(() => {
    if (!isStreaming) {
      lastLengthRef.current = 0;
      return;
    }
    const newLen = streamingContent.length;
    if (newLen > lastLengthRef.current) {
      lastLengthRef.current = newLen;
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [streamingContent, isStreaming]);

  // Also scroll when messages count changes (ai.complete → new message added)
  const messageCount = data?.pages.flatMap((p) => p.messages).length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageCount]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-white/8 animate-pulse shrink-0" />
          <div className="space-y-2 pt-1 flex-1">
            <div className="h-2.5 bg-neutral-100 dark:bg-white/6 rounded-full w-4/5 animate-pulse" />
            <div className="h-2.5 bg-neutral-100 dark:bg-white/6 rounded-full w-3/5 animate-pulse" style={{ animationDelay: "80ms" }} />
            <div className="h-2.5 bg-neutral-100 dark:bg-white/6 rounded-full w-11/12 animate-pulse" style={{ animationDelay: "160ms" }} />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-9 w-44 bg-neutral-100 dark:bg-white/6 rounded-2xl rounded-br-sm animate-pulse" style={{ animationDelay: "60ms" }} />
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-white/8 animate-pulse shrink-0" style={{ animationDelay: "40ms" }} />
          <div className="space-y-2 pt-1 flex-1">
            <div className="h-2.5 bg-neutral-100 dark:bg-white/6 rounded-full w-2/3 animate-pulse" style={{ animationDelay: "100ms" }} />
            <div className="h-2.5 bg-neutral-100 dark:bg-white/6 rounded-full w-5/6 animate-pulse" style={{ animationDelay: "180ms" }} />
          </div>
        </div>
      </div>
    );
  }

  const allMessages = data?.pages.flatMap((p) => p.messages) ?? [];
  const visibleMessages = allMessages.filter(
    (m) => m.role !== "system" && m.status !== "cancelled",
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
      {visibleMessages.map((message) => (
        <MessageBubble key={message.messageId} message={message} />
      ))}

      {isStreaming && <StreamingBubble conversationId={conversationId} />}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
