"use client";

import { memo } from "react";
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

function labelColor(label: string): string {
  const hue = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 55% 45%)`;
}

function formatLabel(l: string) {
  return l.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Label chips ──────────────────────────────────────────────────────────────
function LabelChips({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  const visible  = labels.slice(0, 2);
  const overflow = labels.length - 2;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {visible.map((l) => (
        <span
          key={l}
          className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium text-white leading-tight"
          style={{ backgroundColor: labelColor(l) }}
        >
          {formatLabel(l)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium">
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Velocity ─────────────────────────────────────────────────────────────────
function VelocityRow({ thread, isActive, isFocused, onSelect, onHover }: Omit<ThreadRowProps, "mode">) {
  const sender = thread.from.name || thread.from.email;
  const labels = thread.labels ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3 px-4 h-12",
        "cursor-pointer select-none overflow-hidden",
        "border-b border-black/4 dark:border-white/4",
        "transition-colors duration-75",
        isFocused && !isActive
          ? "bg-black/2.5 dark:bg-white/5"
          : "hover:bg-black/2 dark:hover:bg-white/3",
        isActive && [
          "bg-blue-50/80 dark:bg-white/8",
          "before:absolute before:inset-y-0 before:left-0 before:w-0.75",
          "before:bg-blue-500 dark:before:bg-white/70 before:rounded-r-full",
        ],
      )}
    >
      {/* Unread dot */}
      <div className="w-2 shrink-0 flex justify-center">
        {thread.isUnread && (
          <span className="block w-1.75 h-1.75 rounded-full bg-blue-500 dark:bg-blue-400" />
        )}
      </div>

      {/* Sender */}
      <span className={cn(
        "shrink-0 w-37 truncate text-[13px] tracking-[-0.01em]",
        thread.isUnread
          ? "font-semibold text-gray-900 dark:text-white"
          : "font-normal text-gray-500 dark:text-white/45",
      )}>
        {sender}
      </span>

      {/* Subject · snippet */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
        <span className={cn(
          "shrink-0 max-w-[42%] truncate text-[13px] tracking-[-0.01em]",
          thread.isUnread
            ? "font-semibold text-gray-900 dark:text-white"
            : "font-normal text-gray-700 dark:text-white/65",
        )}>
          {thread.subject || "(no subject)"}
        </span>
        <span className="truncate text-[12px] text-gray-400 dark:text-white/25">
          — {thread.snippet}
        </span>
      </div>

      {/* Labels — visible on hover */}
      {labels.length > 0 && (
        <div className="hidden group-hover:flex shrink-0">
          <LabelChips labels={labels} />
        </div>
      )}

      {/* Date */}
      <span className={cn(
        "shrink-0 ml-2 text-[11.5px] tabular-nums whitespace-nowrap",
        thread.isUnread
          ? "text-gray-600 dark:text-white/55"
          : "text-gray-400 dark:text-white/25",
      )}>
        {formatThreadDate(thread.receivedAt)}
      </span>
    </div>
  );
}

// ─── Flow ─────────────────────────────────────────────────────────────────────
function FlowRow({ thread, isActive, isFocused, onSelect, onHover }: Omit<ThreadRowProps, "mode">) {
  const sender   = thread.from.name || thread.from.email;
  const hue      = senderHue(thread.from.email);
  const initials = senderInitials(thread.from.name, thread.from.email);
  const labels   = thread.labels ?? [];

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
        "mx-2 my-0.5 px-3 py-2.25 rounded-xl",
        "cursor-pointer select-none transition-colors duration-100",
        isFocused && !isActive
          ? "bg-black/4 dark:bg-white/6"
          : "hover:bg-black/3 dark:hover:bg-white/4",
        isActive && "bg-gray-100/80 dark:bg-white/9",
      )}
    >
      {/* Avatar */}
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shadow-sm"
        style={{ background: `hsl(${hue} 52% 46%)` }}
      >
        {initials}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: sender + date */}
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn(
            "truncate text-[13px] leading-snug tracking-[-0.01em]",
            thread.isUnread
              ? "font-semibold text-gray-900 dark:text-white"
              : "font-medium text-gray-500 dark:text-white/50",
          )}>
            {sender}
          </p>
          <span className={cn(
            "flex-shrink-0 text-[11px] tabular-nums",
            thread.isUnread
              ? "text-gray-600 dark:text-white/55"
              : "text-gray-400 dark:text-white/28",
          )}>
            {formatThreadDate(thread.receivedAt)}
          </span>
        </div>

        {/* Row 2: subject */}
        <p className={cn(
          "truncate text-[12.5px] leading-snug mt-[2px]",
          thread.isUnread
            ? "font-medium text-gray-800 dark:text-white/80"
            : "font-normal text-gray-500 dark:text-white/40",
        )}>
          {thread.subject || "(no subject)"}
        </p>

        {/* Row 3: snippet + labels on hover + unread dot */}
        <div className="flex items-center gap-2 mt-[3px]">
          <p className="flex-1 truncate text-[11.5px] text-gray-400 dark:text-white/25">
            {thread.snippet}
          </p>

          {labels.length > 0 && (
            <div className="hidden group-hover:flex shrink-0">
              <LabelChips labels={labels} />
            </div>
          )}

          {thread.isUnread && (
            <span className="w-1.75 h-1.75 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const ThreadRow = memo(function ThreadRow(props: ThreadRowProps) {
  return props.mode === "flow"
    ? <FlowRow {...props} />
    : <VelocityRow {...props} />;
});