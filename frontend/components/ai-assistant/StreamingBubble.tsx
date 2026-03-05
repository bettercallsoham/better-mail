"use client";

import Image from "next/image";
import { useShallow } from "zustand/react/shallow";
import { useConversationStore } from "@/lib/store/conversations.store";
import { ToolCallBadge } from "./ToolCallBadge";
import { AIRichContent } from "./AIRichContent";
import { EmailSourceList } from "./EmailSourceList";

function AIAvatar() {
  return (
    <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full overflow-hidden ring-1 ring-black/8 dark:ring-white/10 bg-[#f5f0e8] dark:bg-[#1e1b14] flex items-center justify-center">
      <Image
        src="/logo.png"
        alt="BetterMail AI"
        width={20}
        height={20}
        className="object-contain dark:invert"
        priority={false}
      />
    </div>
  );
}

interface StreamingBubbleProps {
  conversationId: string;
}

export function StreamingBubble({ conversationId }: StreamingBubbleProps) {
  const { content, isStreaming, toolInProgress, sources } =
    useConversationStore(
      useShallow((s) => ({
        content: s.streamingMessages[conversationId]?.content ?? "",
        isStreaming: s.streamingMessages[conversationId]?.isStreaming ?? false,
        toolInProgress:
          s.streamingMessages[conversationId]?.toolInProgress ?? null,
        sources: s.streamingMessages[conversationId]?.sources ?? [],
      })),
    );

  if (!isStreaming && !content) return null;

  return (
    <div className="flex items-start gap-2.5">
      <AIAvatar />

      <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
        <ToolCallBadge tool={toolInProgress} />

        {content && <AIRichContent content={content} cursor={isStreaming} />}

        {sources.length > 0 && <EmailSourceList sources={sources} />}
      </div>
    </div>
  );
}
