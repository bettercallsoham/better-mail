"use client";

import { IconPlus, IconMessageCircle } from "@tabler/icons-react";
import {
  useConversations,
  useCreateConversation,
} from "@/features/conversations/conversations.query";
import { useAIStore } from "@/lib/store/ui.store";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

interface ConversationListProps {
  /** Called when user selects a prompt from the empty state */
  onPromptSelect?: (prompt: string) => void;
  className?: string;
}

export function ConversationList({
  onPromptSelect,
  className,
}: ConversationListProps) {
  const { data, isLoading } = useConversations();
  const { mutate: createConversation, isPending } = useCreateConversation();
  const { activeAIConversationId, setActiveAIConversationId } = useAIStore();

  const allConversations = data?.pages.flatMap((p) => p.summaries) ?? [];

  const handleNew = () => {
    createConversation(undefined, {
      onSuccess: (res) => setActiveAIConversationId(res.conversationId),
    });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* New chat button */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button
          onClick={handleNew}
          disabled={isPending}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-neutral-500 dark:text-white/70 hover:text-neutral-800 dark:hover:text-white bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/8 hover:border-neutral-300 dark:hover:border-white/15 rounded-xl transition-all duration-150 disabled:opacity-50 cursor-pointer"
        >
          <IconPlus size={14} />
          New conversation
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isLoading ? (
          <div className="space-y-1 py-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-neutral-100 dark:bg-white/4 animate-pulse"
                style={{ animationDelay: `${i * 60}ms`, opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : allConversations.length === 0 ? (
          <div className="py-4">
            {/* <SuggestedPrompts onSelect={onPromptSelect ?? (() => {})} /> */}
          </div>
        ) : (
          allConversations.map((conv) => (
            <button
              key={conv.conversationId}
              onClick={() => setActiveAIConversationId(conv.conversationId)}
              className={cn(
                "flex items-center gap-2.5 w-full py-2.5 rounded-xl text-left transition-all duration-150 border-l-2 cursor-pointer",
                activeAIConversationId === conv.conversationId
                  ? "bg-neutral-100 dark:bg-white/8 text-neutral-800 dark:text-white border-amber-500 dark:border-amber-400 pl-[10px] pr-3"
                  : "text-neutral-500 dark:text-white/60 hover:bg-neutral-50 dark:hover:bg-white/6 hover:text-neutral-800 dark:hover:text-white/85 border-transparent px-3",
              )}
            >
              <IconMessageCircle size={14} className="shrink-0 opacity-50" />
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-medium truncate leading-snug">
                  {conv.title || "New conversation"}
                </span>
                <span className="block text-[11px] opacity-50 mt-0.5">
                  {formatRelativeTime(conv.lastMessageAt)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
