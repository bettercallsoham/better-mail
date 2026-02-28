"use client";

import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { EmailAvatar } from "./EmailAvatar";
import { cn } from "@/lib/utils";

interface QuickReplyProps {
  /** Current user email — for the left avatar */
  userEmail: string;
  userName?: string;
  onReply:   () => void;
  onForward: () => void;
  variant?: "float" | "inline";
}

export function QuickReply({
  userEmail, userName, onReply, onForward, variant = "float",
}: QuickReplyProps) {
  if (variant === "float") {
    return (
      <div className="absolute bottom-0 inset-x-0 pointer-events-none pb-4 px-5">
        <div className={cn(
          "pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl",
          "bg-white/70 dark:bg-[#1c1c1c]/85 backdrop-blur-3xl",
          "shadow-[0_2px_20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_-1px_0_rgba(255,255,255,0.06),0_4px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.07)]",
        )}>
          <button
            onClick={onReply}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-[13px] font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <IconArrowBackUp size={15} />
            Reply
            <kbd className="text-[10px] font-mono opacity-40 ml-0.5">R</kbd>
          </button>
          <button
            onClick={onForward}
            className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-[13px] font-medium text-gray-500 dark:text-white/45 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
          >
            <IconArrowForwardUp size={15} />
            Forward
            <kbd className="text-[10px] font-mono opacity-40 ml-0.5">F</kbd>
          </button>
        </div>
      </div>
    );
  }

  // inline variant — docked at bottom of overlay
  return (
    <div className={cn(
      "shrink-0 flex items-center gap-3 px-4 py-3",
      "border-t border-black/[0.06] dark:border-white/[0.06]",
      "bg-white dark:bg-[#18181b]",
    )}>
      <EmailAvatar email={userEmail} name={userName} size={7} />
      <button
        onClick={onReply}
        className="flex-1 flex items-center gap-2 px-3.5 h-9 rounded-xl text-[13px] text-gray-400 dark:text-white/28 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-left"
      >
        Quick reply…
      </button>
      <div className="flex items-center gap-1.5">
        {[
          { label: "😊", title: "Emoji" },
          { label: "📎", title: "Attach" },
        ].map(({ label, title }) => (
          <button
            key={title}
            title={title}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/25 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors text-base"
          >
            {label}
          </button>
        ))}
        <button
          onClick={onReply}
          title="Send reply (R)"
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
        >
          <IconArrowBackUp size={13} />
          Reply
        </button>
      </div>
    </div>
  );
}