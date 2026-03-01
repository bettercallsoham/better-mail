"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  IconStar, IconStarFilled, IconChevronDown,
  IconArrowBackUp, IconArrowBackUpDouble, IconArrowForwardUp, IconPaperclip,
} from "@tabler/icons-react";
import { EmailAvatar } from "./EmailAvatar";
import { EmailIframe } from "./EmailIframe";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { cn } from "@/lib/utils";

// ─── Collapsed ─────────────────────────────────────────────────────────────────
function CollapsedRow({ email, onClick }: { email: FullEmail; onClick: () => void }) {
  const date = format(new Date(email.receivedAt), "MMM d, h:mm a");
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-black/3 dark:hover:bg-white/4 transition-colors group"
    >
      <EmailAvatar name={email.from.name} email={email.from.email} size={7} />
      <span className="text-[12.5px] font-medium text-gray-500 dark:text-white/38 truncate flex-1 text-left">
        {email.from.name || email.from.email}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-white/22 tabular-nums shrink-0">{date}</span>
      <IconChevronDown
        size={13}
        className="text-gray-300 dark:text-white/18 shrink-0 group-hover:text-gray-500 dark:group-hover:text-white/38 transition-colors"
      />
    </button>
  );
}

// ─── Open ──────────────────────────────────────────────────────────────────────
function OpenCard({
  email, onCollapse, onReply, onReplyAll, onForward, onStar,
}: {
  email:       FullEmail;
  onCollapse:  () => void;
  onReply:     () => void;
  onReplyAll?: () => void;
  onForward:   () => void;
  onStar:      () => void;
}) {
  const date    = format(new Date(email.receivedAt), "MMM d, h:mm a");
  const toNames = email.to.map(r => r.name || r.email).join(", ");
  const hasAttachments = !!(email as FullEmail & { attachments?: unknown[] }).attachments?.length;

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden",
      "bg-white dark:bg-[#201e1b]",
      "ring-1 ring-black/4 dark:ring-white/[0.07]",
      "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
      "dark:shadow-[0_2px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)]",
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button onClick={onCollapse} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <EmailAvatar name={email.from.name} email={email.from.email} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white/90 truncate leading-snug tracking-[-0.015em]">
              {email.from.name || email.from.email}
            </p>
            <p className="text-[11.5px] text-gray-400 dark:text-white/28 truncate mt-px">
              To: {toNames}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasAttachments && (
            <span className="flex items-center px-1.5 py-0.5 rounded-md bg-black/4 dark:bg-white/6">
              <IconPaperclip size={10} className="text-gray-400 dark:text-white/30" />
            </span>
          )}
          <button
            onClick={onStar}
            className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.07] transition-all"
          >
            {email.isStarred
              ? <IconStarFilled size={14} className="text-amber-400" />
              : <IconStar size={14} className="text-gray-300 dark:text-white/18 hover:text-amber-400 transition-colors" />
            }
          </button>
          <span className="text-[11px] tabular-nums text-gray-400 dark:text-white/25">{date}</span>
          <button
            onClick={onCollapse}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 dark:text-white/18 hover:text-gray-500 transition-colors"
          >
            <IconChevronDown size={13} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="border-t border-black/4 dark:border-white/5">
        {email.bodyHtml
          ? <EmailIframe html={email.bodyHtml} />
          : (
            <p className="px-5 py-4 text-[14px] text-gray-700 dark:text-white/58 leading-relaxed whitespace-pre-wrap">
              {email.bodyText ?? email.snippet}
            </p>
          )
        }
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-black/4 dark:border-white/5">
        <button
          onClick={onReply}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-gray-500 dark:text-white/42 hover:text-gray-800 dark:hover:text-white/80 hover:bg-black/4 dark:hover:bg-white/6 transition-colors"
        >
          <IconArrowBackUp size={14} />
          Reply
        </button>
        {onReplyAll && (
          <button
            onClick={onReplyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-gray-500 dark:text-white/42 hover:text-gray-800 dark:hover:text-white/80 hover:bg-black/4 dark:hover:bg-white/6 transition-colors"
          >
            <IconArrowBackUpDouble size={14} />
            Reply All
          </button>
        )}
        <button
          onClick={onForward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-gray-500 dark:text-white/42 hover:text-gray-800 dark:hover:text-white/80 hover:bg-black/4 dark:hover:bg-white/6 transition-colors"
        >
          <IconArrowForwardUp size={14} />
          Forward
        </button>
      </div>
    </div>
  );
}

// ─── Public wrapper ─────────────────────────────────────────────────────────────
interface EmailCardProps {
  email:        FullEmail;
  defaultOpen:  boolean;
  onReply:      () => void;
  onReplyAll?:  () => void;
  onForward:    () => void;
  onStar:       () => void;
}

export function EmailCard({ email, defaultOpen, onReply, onReplyAll, onForward, onStar }: EmailCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return <CollapsedRow email={email} onClick={() => setOpen(true)} />;
  }

  return (
    <OpenCard
      email={email}
      onCollapse={() => setOpen(false)}
      onReply={onReply}
      onReplyAll={onReplyAll}
      onForward={onForward}
      onStar={onStar}
    />
  );
}