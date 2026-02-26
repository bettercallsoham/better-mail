"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadEmail } from "@/features/mailbox/mailbox.type";
import { formatThreadDate } from "@/lib/date";

interface ThreadRowProps {
  thread:    ThreadEmail;
  isActive:  boolean;
  isFocused: boolean;
  mode:      "velocity" | "flow";
  onSelect:  () => void;
  onHover:   () => void;
  onStar?:   () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function senderInitials(name?: string, email?: string): string {
  const src   = name?.trim() || email?.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

function senderHue(email?: string): number {
  if (!email) return 220;
  return email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

// ─── Label metadata ───────────────────────────────────────────────────────────
const LABEL_META: Record<string, { icon: string; color: string; name: string }> = {
  CATEGORY_PERSONAL:   { icon: "👤", color: "#6366f1", name: "Personal"   },
  CATEGORY_PROMOTIONS: { icon: "🏷",  color: "#f59e0b", name: "Promotions" },
  CATEGORY_UPDATES:    { icon: "🔔", color: "#3b82f6", name: "Updates"    },
  CATEGORY_SOCIAL:     { icon: "💬", color: "#10b981", name: "Social"     },
  CATEGORY_FORUMS:     { icon: "📋", color: "#8b5cf6", name: "Forums"     },
  IMPORTANT:           { icon: "⚡", color: "#f59e0b", name: "Important"  },
};

const HIDDEN_LABELS = new Set(["INBOX", "UNREAD", "SENT", "DRAFT", "TRASH", "SPAM"]);

function visibleLabels(labels: string[]) {
  return labels.filter((l) => !HIDDEN_LABELS.has(l));
}

// ─── Label dot + tooltip ─────────────────────────────────────────────────────
function LabelDot({ label }: { label: string }) {
  const meta = LABEL_META[label];
  if (!meta) return null;

  return (
    <div className="group/tip relative flex items-center justify-center">
      <span
        className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] leading-none select-none"
        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
      >
        {meta.icon}
      </span>
      <span className="
        pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
        px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap
        bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100 z-50
      ">
        {meta.name}
      </span>
    </div>
  );
}

// ─── Shared right-side meta (labels + star + date) ────────────────────────────
function RowMeta({
  thread,
  onStar,
}: {
  thread: ThreadEmail;
  onStar?: () => void;
}) {
  const labels = visibleLabels(thread.labels ?? []);

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {labels.length > 0 && (
        <div className="flex items-center gap-0.5">
          {labels.slice(0, 3).map((l) => (
            <LabelDot key={l} label={l} />
          ))}
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onStar?.(); }}
        className={cn(
          "flex items-center justify-center w-4 h-4 transition-all",
          thread.isStarred
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-40 hover:opacity-100!",
        )}
      >
        <Star className={cn(
          "w-3.5 h-3.5",
          thread.isStarred
            ? "fill-amber-400 text-amber-400"
            : "text-gray-400 dark:text-white/30",
        )} />
      </button>

      <span className={cn(
        "text-[11px] tabular-nums whitespace-nowrap",
        thread.isUnread
          ? "text-gray-600 dark:text-white/55"
          : "text-gray-400 dark:text-white/28",
      )}>
        {formatThreadDate(thread.receivedAt)}
      </span>
    </div>
  );
}

// ─── Flow Row — avatar + 2 lines, clean breathing space ──────────────────────
function FlowRow({
  thread, isActive, isFocused, onSelect, onHover, onStar,
}: Omit<ThreadRowProps, "mode">) {
  const sender   = thread.from.name || thread.from.email;
  const hue      = senderHue(thread.from.email);
  const initials = senderInitials(thread.from.name, thread.from.email);
  const isUnread = thread.isUnread;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3",
        "mx-2 my-px px-3 py-2.75 rounded-xl",
        "cursor-pointer select-none transition-colors duration-100",
        isFocused && !isActive && "bg-black/4 dark:bg-white/6",
        !isFocused && !isActive && "hover:bg-black/3 dark:hover:bg-white/4",
        isActive && "bg-black/6 dark:bg-white/9",
      )}
    >
      
      {/* Avatar */}
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium text-white"
        style={{ background: `hsl(${hue} 50% 46%)` }}
      >
        {initials}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        {/* Line 1: sender + meta */}
        <div className="flex items-center gap-2">
          <p className={cn(
            "flex-1 min-w-0 truncate leading-none",
            isUnread
              ? "text-[13.5px] font-semibold text-gray-950 dark:text-white"
              : "text-[13.5px] font-normal text-gray-500 dark:text-white/50",
          )}>
            {sender}
          </p>
          <RowMeta thread={thread} onStar={onStar} />
        </div>

        {/* Line 2: subject */}
        <p className={cn(
          "truncate leading-none",
          isUnread
            ? "text-[12.5px] font-medium text-gray-600 dark:text-white/65"
            : "text-[12.5px] font-normal text-gray-400 dark:text-white/32",
        )}>
          {thread.subject || "(no subject)"}
        </p>
      </div>
    </div>
  );
}

// ─── Velocity Row — dense single-line power-user layout ──────────────────────
function VelocityRow({
  thread, isActive, isFocused, onSelect, onHover, onStar,
}: Omit<ThreadRowProps, "mode">) {
  const sender   = thread.from.name || thread.from.email;
  const isUnread = thread.isUnread;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3 px-4 h-13",
        "cursor-pointer select-none overflow-hidden",
        "border-b border-black/4 dark:border-white/4",
        "transition-colors duration-75",
        isFocused && !isActive && "bg-black/2.5 dark:bg-white/5",
        !isFocused && !isActive && "hover:bg-black/2 dark:hover:bg-white/3",
        isActive && [
          "bg-blue-50/80 dark:bg-white/8",
          "before:absolute before:inset-y-0 before:left-0 before:w-0.5",
          "before:bg-blue-500 dark:before:bg-white/70 before:rounded-r-full",
        ],
      )}
    >
      {/* Unread dot */}
      <div className="w-2 shrink-0 flex justify-center">
        {isUnread && (
          <span className="block w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
        )}
      </div>

      {/* Sender */}
      <span className={cn(
        "shrink-0 w-36 truncate text-[13px] tracking-[-0.01em]",
        isUnread
          ? "font-semibold text-gray-950 dark:text-white"
          : "font-normal text-gray-500 dark:text-white/45",
      )}>
        {sender}
      </span>

      {/* Subject only */}
      <span className={cn(
        "flex-1 min-w-0 truncate text-[13px] tracking-[-0.01em]",
        isUnread
          ? "font-semibold text-gray-800 dark:text-white/85"
          : "font-normal text-gray-600 dark:text-white/55",
      )}>
        {thread.subject || "(no subject)"}
      </span>

      <RowMeta thread={thread} onStar={onStar} />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const ThreadRow = memo(function ThreadRow(props: ThreadRowProps) {
  return props.mode === "flow"
    ? <FlowRow {...props} />
    : <VelocityRow {...props} />;
});