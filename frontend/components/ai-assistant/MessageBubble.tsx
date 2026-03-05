"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/features/conversations/conversations.type";
import { EmailSourceList } from "./EmailSourceList";
import { AIRichContent } from "./AIRichContent";

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

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isFailed = message.status === "failed";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-br-sm text-[13px] leading-relaxed font-[450] whitespace-pre-wrap break-words",
            isFailed
              ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"
              : "bg-neutral-100 dark:bg-white/8 text-neutral-800 dark:text-[#e2ddd6] border border-neutral-200/60 dark:border-white/6",
          )}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-2.5">
      <AIAvatar />

      <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
        {isFailed ? (
          <p className="text-[13px] text-red-500 dark:text-red-400 italic">
            Something went wrong. Please try again.
          </p>
        ) : (
          <AIRichContent content={message.content} />
        )}

        {message.sources && message.sources.length > 0 && (
          <EmailSourceList sources={message.sources} />
        )}
      </div>
    </div>
  );
}
