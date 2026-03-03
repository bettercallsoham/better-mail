"use client";

import { InboxZeroEmail } from "@/features/mailbox/mailbox.type";
import { formatDistanceToNow } from "date-fns";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  email: InboxZeroEmail;
  onClick: () => void;
}

function SenderAvatar({ name, email }: { name?: string; email: string }) {
  const initial = (name ?? email).charAt(0).toUpperCase();
  return (
    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[13px] font-semibold text-neutral-600 dark:text-neutral-300 shrink-0 select-none">
      {initial}
    </span>
  );
}

export function InboxZeroCard({ email, onClick }: Props) {
  const senderName = email.from.name ?? email.from.email;
  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), {
    addSuffix: true,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl transition-colors duration-150",
        "border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900/50",
        "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
      )}
    >
      <SenderAvatar name={email.from.name} email={email.from.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {senderName}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
            {timeAgo}
          </span>
        </div>
        <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200 truncate mb-0.5">
          {email.subject}
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] text-neutral-400 dark:text-neutral-500 truncate flex-1">
            {email.snippet}
          </p>
          {email.hasAttachments && (
            <Paperclip
              size={11}
              className="text-neutral-400 dark:text-neutral-500 shrink-0"
            />
          )}
        </div>
      </div>
    </button>
  );
}
