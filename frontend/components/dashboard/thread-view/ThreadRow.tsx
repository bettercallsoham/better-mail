"use client";

import { memo } from "react";
import { Star, ArchiveRestore, MailOpen, Mail, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadEmail } from "@/features/mailbox/mailbox.type";
import { formatThreadDate } from "@/lib/date";
import type { useThreadActions } from "@/hooks/keyboard/useThreadActions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";

interface ThreadRowProps {
  thread:    ThreadEmail;
  isActive:  boolean;
  isFocused: boolean;
  mode:      "velocity" | "flow";
  actions:   ReturnType<typeof useThreadActions>;
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

// ─── Label dot ────────────────────────────────────────────────────────────────
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
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-75 z-50
      ">
        {meta.name}
      </span>
    </div>
  );
}

// ─── Shared action buttons ────────────────────────────────────────────────────
// Used by both modes — size prop controls icon/button dimensions
function ActionTray({
  thread,
  onStar,
  onMarkRead,
  onArchive,
  size = "default",
}: {
  thread:     ThreadEmail;
  onStar:     (e: React.MouseEvent) => void;
  onMarkRead: (e: React.MouseEvent) => void;
  onArchive:  (e: React.MouseEvent) => void;
  size?:      "default" | "sm";
}) {
  const btnCls = cn(
    "flex items-center justify-center rounded-md transition-colors duration-75",
    "text-gray-400 dark:text-white/25",
    "hover:text-gray-700 dark:hover:text-white/70",
    "hover:bg-black/[0.07] dark:hover:bg-white/[0.09]",
    size === "sm" ? "w-6 h-6" : "w-7 h-7",
  );
  const iconSz = size === "sm" ? 13 : 14;

  const isArchived = thread.isArchived;

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex items-center gap-px shrink-0">
        {/* Star */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onStar}
              className={cn(btnCls, thread.isStarred && "text-amber-400 hover:text-amber-500")}
              aria-label={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                size={iconSz}
                className={cn(thread.isStarred ? "fill-amber-400 text-amber-400" : "")}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-1.5 py-1 px-2">
            <span className="text-[11px]">{thread.isStarred ? "Unstar" : "Star"}</span>
            <Kbd className="text-[9px]">S</Kbd>
          </TooltipContent>
        </Tooltip>

        <div className="h-3 w-px bg-gray-200 dark:bg-white/10 mx-0.5" />

        {/* Mark read/unread */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onMarkRead} className={btnCls} aria-label={thread.isUnread ? "Mark read" : "Mark unread"}>
              {thread.isUnread ? <MailOpen size={iconSz} /> : <Mail size={iconSz} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-1.5 py-1 px-2">
            <span className="text-[11px]">{thread.isUnread ? "Mark read" : "Mark unread"}</span>
            <Kbd className="text-[9px]">U</Kbd>
          </TooltipContent>
        </Tooltip>

        {/* Archive / Unarchive */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onArchive} className={btnCls} aria-label={isArchived ? "Unarchive" : "Archive"}>
              {isArchived
                ? <ArchiveRestore size={iconSz} />
                : <Archive size={iconSz} />
              }
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="flex items-center gap-1.5 py-1 px-2">
            <span className="text-[11px]">{isArchived ? "Unarchive" : "Archive"}</span>
            <Kbd className="text-[9px]">E</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// ─── Velocity Row ─────────────────────────────────────────────────────────────
// Right side: date fades out, tray fades in — zero layout shift
// Star is always visible when starred
function VelocityRow({ thread, isActive, isFocused, actions, onSelect, onHover }: Omit<ThreadRowProps, "mode">) {
  const { star, markRead, archiveToggle } = actions;
  const sender   = thread.from.name || thread.from.email;
  const isUnread = thread.isUnread;
  const stop     = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      role="button" tabIndex={0}
      onClick={onSelect} onMouseEnter={onHover} onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3 px-4 h-[52px]",
        "cursor-pointer select-none overflow-hidden",
        "border-b border-black/[0.04] dark:border-white/[0.04]",
        "transition-colors duration-75",
        isFocused && !isActive && "bg-black/[0.025] dark:bg-zinc-700/50",
        !isFocused && !isActive && "hover:bg-black/[0.02] dark:hover:bg-zinc-800/60",
        isActive && [
          "bg-blue-50/80 dark:bg-zinc-700/25 dark:ring-inset dark:ring-1 dark:ring-white/[0.08]",
          "before:absolute before:inset-y-0 before:left-0 before:w-0.5",
          "before:bg-blue-500 dark:before:bg-white/70 before:rounded-r-full",
        ],
      )}
    >
      {/* Unread dot */}
      <div className="w-2 shrink-0 flex justify-center">
        {isUnread && <span className="block w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />}
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

      {/* Subject — flex-1 so it fills remaining space */}
      <span className={cn(
        "flex-1 min-w-0 truncate text-[13px] tracking-[-0.01em]",
        isUnread
          ? "font-semibold text-gray-800 dark:text-white/85"
          : "font-normal text-gray-600 dark:text-white/55",
      )}>
        {thread.subject || "(no subject)"}
      </span>

      {/* ── Right zone — date + tray overlay ──────────────────────────────── */}
      <div className="relative flex items-center justify-end shrink-0 w-[120px]">

        {/* Date — fades out on hover OR keyboard focus */}
        <span className={cn(
          "absolute right-0 text-[11px] tabular-nums whitespace-nowrap",
          "transition-opacity duration-100",
          isUnread
            ? "text-gray-600 dark:text-white/55"
            : "text-gray-400 dark:text-white/28",
          (isFocused || undefined) && "opacity-0",
          !isFocused && "group-hover:opacity-0",
        )}>
          {thread.isStarred && (
            <Star size={10} className="inline-block fill-amber-400 text-amber-400 mr-1 mb-px" />
          )}
          {formatThreadDate(thread.receivedAt)}
        </span>

        {/* Tray — fades in on hover OR keyboard focus */}
        <div className={cn(
          "absolute right-0 transition-opacity duration-100",
          isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}>
          <ActionTray
            thread={thread}
            onStar={stop(star)}
            onMarkRead={stop(markRead)}
            onArchive={stop(archiveToggle)}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Flow Row ─────────────────────────────────────────────────────────────────
// Two-line card layout. On hover, label dots fade out and tray fades in
// beside the date (date stays dimmed for context)
function FlowRow({ thread, isActive, isFocused, actions, onSelect, onHover }: Omit<ThreadRowProps, "mode">) {
  const { star, markRead, archiveToggle } = actions;
  const hue      = senderHue(thread.from.email);
  const initials = senderInitials(thread.from.name, thread.from.email);
  const sender   = thread.from.name || thread.from.email;
  const isUnread = thread.isUnread;
  const labels   = visibleLabels(thread.labels ?? []);
  const stop     = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      role="button" tabIndex={0}
      onClick={onSelect} onMouseEnter={onHover} onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3",
        "mx-2 my-px px-3 py-2.5 rounded-xl",
        "cursor-pointer select-none transition-colors duration-75",
        isFocused && !isActive && "bg-black/[0.04] dark:bg-zinc-700/50",
        !isFocused && !isActive && "hover:bg-black/[0.03] dark:hover:bg-zinc-800/60",
        isActive && "bg-black/[0.06] dark:bg-zinc-700/25 dark:ring-1 dark:ring-white/[0.08]",
      )}
    >
      {/* Avatar */}
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium text-white"
        style={{ background: `hsl(${hue} 50% 46%)` }}
      >
        {initials}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">

        {/* Row 1: sender + right zone */}
        <div className="flex items-center gap-2">
          <p className={cn(
            "flex-1 min-w-0 truncate leading-none",
            isUnread
              ? "text-[13.5px] font-semibold text-gray-950 dark:text-white"
              : "text-[13.5px] font-normal text-gray-500 dark:text-white/50",
          )}>
            {sender}
          </p>

          {/* ── Right zone ───────────────────────────────────────────────── */}
          <div className="relative flex items-center justify-end shrink-0 h-5">

            {/* Label dots + date (normal state) */}
            <div className={cn(
              "flex items-center gap-1.5 transition-opacity duration-100",
              isFocused ? "opacity-0" : "group-hover:opacity-0",
            )}>
              {labels.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {labels.slice(0, 3).map((l) => <LabelDot key={l} label={l} />)}
                </div>
              )}
              {thread.isStarred && (
                <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
              )}
              <span className={cn(
                "text-[11px] tabular-nums whitespace-nowrap",
                isUnread
                  ? "text-gray-600 dark:text-white/55"
                  : "text-gray-400 dark:text-white/28",
              )}>
                {formatThreadDate(thread.receivedAt)}
              </span>
            </div>

            {/* Tray — fades in on hover OR keyboard focus */}
            <div className={cn(
              "absolute right-0 transition-opacity duration-100",
              isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}>
              <ActionTray
                thread={thread}
                onStar={stop(star)}
                onMarkRead={stop(markRead)}
                onArchive={stop(archiveToggle)}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Row 2: subject */}
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

// ─── Export ───────────────────────────────────────────────────────────────────
export const ThreadRow = memo(function ThreadRow(props: ThreadRowProps) {
  return props.mode === "flow"
    ? <FlowRow {...props} />
    : <VelocityRow {...props} />;
});