"use client";

import { useConversationRealtime } from "@/features/conversations/useConversationRealtime";
import { MessageList } from "./MessageList";
import type { ReactNode } from "react";

interface ConversationViewProps {
  conversationId: string;
  /** Optional footer slot (e.g. AIInput) */
  footer?: ReactNode;
  className?: string;
}

export function ConversationView({
  conversationId,
  footer,
  className,
}: ConversationViewProps) {
  // Establishes the Pusher subscription for this conversation.
  // Handles all ai.token / ai.tool.start / ai.complete events.
  useConversationRealtime(conversationId);

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <MessageList conversationId={conversationId} />
      {footer && <div className="px-3 pb-3 pt-1 shrink-0">{footer}</div>}
    </div>
  );
}
