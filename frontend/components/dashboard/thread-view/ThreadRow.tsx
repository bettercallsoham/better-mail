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
  thread: ThreadEmail;
  isActive: boolean;
  isFocused: boolean;
  mode: "velocity" | "flow";
  actions: ReturnType<typeof useThreadActions>;
  onSelect: () => void;
  onHover: () => void;
}

function senderInitials(name?: string, email?: string): string {
  const src = name?.trim() || email?.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

function senderHue(email?: string): number {
  if (!email) return 220;
  return email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

// ─── Fixed semantic label palette ─────────────────────────────────────────────
// Dark variants: slightly higher opacity + lighter hue to work on #191919 base
const LABEL_META: Record<
  string,
  {
    icon: string;
    name: string;
    bg: string;
    text: string; // light mode
    darkBg: string;
    darkText: string; // dark mode
  }
> = {
  CATEGORY_PERSONAL: {
    icon: "👤",
    name: "Personal",
    bg: "rgba(99,102,241,0.08)",
    text: "#4f46e5",
    darkBg: "rgba(99,102,241,0.15)",
    darkText: "#818cf8",
  },
  CATEGORY_PROMOTIONS: {
    icon: "🏷",
    name: "Promotions",
    bg: "rgba(120,113,108,0.09)",
    text: "#78716c",
    darkBg: "rgba(255,255,255,0.07)",
    darkText: "rgba(255,255,255,0.42)",
  },
  CATEGORY_UPDATES: {
    icon: "🔔",
    name: "Updates",
    bg: "rgba(100,116,139,0.08)",
    text: "#475569",
    darkBg: "rgba(100,116,139,0.15)",
    darkText: "#94a3b8",
  },
  CATEGORY_SOCIAL: {
    icon: "💬",
    name: "Social",
    bg: "rgba(16,185,129,0.08)",
    text: "#059669",
    darkBg: "rgba(16,185,129,0.14)",
    darkText: "#34d399",
  },
  CATEGORY_FORUMS: {
    icon: "📋",
    name: "Forums",
    bg: "rgba(139,92,246,0.08)",
    text: "#7c3aed",
    darkBg: "rgba(139,92,246,0.14)",
    darkText: "#a78bfa",
  },
  IMPORTANT: {
    icon: "⚡",
    name: "Important",
    bg: "rgba(217,119,6,0.08)",
    text: "#b45309",
    darkBg: "rgba(217,119,6,0.15)",
    darkText: "#fbbf24",
  },
};
const HIDDEN_LABELS = new Set([
  "INBOX",
  "UNREAD",
  "SENT",
  "DRAFT",
  "TRASH",
  "SPAM",
]);

function visibleLabels(labels: string[]) {
  return labels.filter((l) => !HIDDEN_LABELS.has(l));
}

function LabelDot({ label, dark }: { label: string; dark?: boolean }) {
  const meta = LABEL_META[label];
  if (!meta) return null;
  return (
    <div className="group/tip relative flex items-center justify-center">
      <span
        className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] leading-none select-none"
        style={{
          backgroundColor: meta.bg,
          color: meta.text,
        }}
      >
        {meta.icon}
      </span>
      <span
        className="
        pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
        px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap
        bg-[#2a2a2a] text-white/85
        opacity-0 group-hover/tip:opacity-100 transition-opacity duration-75 z-50
      "
      >
        {meta.name}
      </span>
    </div>
  );
}

function ActionTray({
  thread,
  onStar,
  onMarkRead,
  onArchive,
  size = "default",
}: {
  thread: ThreadEmail;
  onStar: (e: React.MouseEvent) => void;
  onMarkRead: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  size?: "default" | "sm";
}) {
  const btnCls = cn(
    "flex items-center justify-center rounded-md transition-colors duration-75",
    "text-gray-400 dark:text-white/28",
    "hover:text-gray-700 dark:hover:text-white/65",
    "hover:bg-black/[0.07] dark:hover:bg-white/[0.08]",
    size === "sm" ? "w-6 h-6" : "w-7 h-7",
  );
  const iconSz = size === "sm" ? 13 : 14;
  const isArchived = thread.isArchived;

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex items-center gap-px shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onStar}
              className={cn(
                btnCls,
                thread.isStarred && "text-amber-400 hover:text-amber-500",
              )}
              aria-label={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                size={iconSz}
                className={cn(
                  thread.isStarred ? "fill-amber-400 text-amber-400" : "",
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="flex items-center gap-1.5 py-1 px-2"
          >
            <span className="text-[11px]">
              {thread.isStarred ? "Unstar" : "Star"}
            </span>
            <Kbd className="text-[9px]">S</Kbd>
          </TooltipContent>
        </Tooltip>

        <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onMarkRead}
              className={btnCls}
              aria-label={thread.isUnread ? "Mark read" : "Mark unread"}
            >
              {thread.isUnread ? (
                <MailOpen size={iconSz} />
              ) : (
                <Mail size={iconSz} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="flex items-center gap-1.5 py-1 px-2"
          >
            <span className="text-[11px]">
              {thread.isUnread ? "Mark read" : "Mark unread"}
            </span>
            <Kbd className="text-[9px]">U</Kbd>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onArchive}
              className={btnCls}
              aria-label={isArchived ? "Unarchive" : "Archive"}
            >
              {isArchived ? (
                <ArchiveRestore size={iconSz} />
              ) : (
                <Archive size={iconSz} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="flex items-center gap-1.5 py-1 px-2"
          >
            <span className="text-[11px]">
              {isArchived ? "Unarchive" : "Archive"}
            </span>
            <Kbd className="text-[9px]">E</Kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// ─── Velocity Row ─────────────────────────────────────────────────────────────
// Dark mode elevation:
//   base    → transparent (inherits #191919 from body)
//   hover   → dark:hover:bg-white/[0.04]   subtle warmth
//   focused → dark:bg-white/[0.05]         keyboard-nav visible
//   active  → dark:bg-white/[0.07]         selected, not jarring
function VelocityRow({
  thread,
  isActive,
  isFocused,
  actions,
  onSelect,
  onHover,
}: Omit<ThreadRowProps, "mode">) {
  const { star, markRead, archiveToggle } = actions;
  const sender = thread.from.name || thread.from.email;
  const isUnread = thread.isUnread;
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={cn(
        "group relative flex items-center gap-3 px-4 h-[44px]",
        "cursor-pointer select-none overflow-hidden",
        "border-b border-black/[0.04] dark:border-white/[0.045]",
        "transition-colors duration-75",
        // DARK: pure rgba overlays on #191919 — no zinc/slate bg colors
        isFocused && !isActive && "bg-black/[0.05] dark:bg-white/[0.05]",
        !isFocused &&
          !isActive &&
          "hover:bg-black/[0.02] dark:hover:bg-white/[0.04]",
        isActive && [
          "bg-black/[0.04] dark:bg-white/[0.06]",
          "before:absolute before:inset-y-[6px] before:left-0 before:w-[2px]",
          "before:bg-zinc-800 dark:before:bg-white/50 before:rounded-r-full",
        ],
      )}
    >
      <div className="w-2 shrink-0 flex justify-center">
        {isUnread && (
          <span className="block w-[5px] h-[5px] rounded-full bg-zinc-700 dark:bg-white/55 shadow-[0_0_4px_rgba(255,255,255,0.2)]" />
        )}
      </div>

      <span
        className={cn(
          "shrink-0 w-36 truncate text-[13px] tracking-[-0.015em]",
          isUnread
            ? "font-semibold text-gray-950 dark:text-white"
            : "font-normal text-gray-500 dark:text-white/35",
        )}
      >
        {sender}
      </span>

      <span
        className={cn(
          "flex-1 min-w-0 truncate text-[13px] tracking-[-0.01em]",
          isUnread
            ? "font-medium text-gray-800 dark:text-white/75"
            : "font-normal text-gray-500 dark:text-white/35",
        )}
      >
        {thread.subject || "(no subject)"}
      </span>

      <div className="relative flex items-center justify-end shrink-0 w-[120px]">
        <span
          className={cn(
            "absolute right-0 text-[11px] tabular-nums whitespace-nowrap transition-opacity duration-100",
            isUnread
              ? "text-gray-500 dark:text-white/42"
              : "text-gray-400 dark:text-white/22",
            (isFocused || undefined) && "opacity-0",
            !isFocused && "group-hover:opacity-0",
          )}
        >
          {thread.isStarred && (
            <Star
              size={10}
              className="inline-block fill-amber-400 text-amber-400 mr-1 mb-px"
            />
          )}
          {formatThreadDate(thread.receivedAt)}
        </span>
        <div
          className={cn(
            "absolute right-0 transition-opacity duration-100",
            isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
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
function FlowRow({
  thread,
  isActive,
  isFocused,
  actions,
  onSelect,
  onHover,
}: Omit<ThreadRowProps, "mode">) {
  const { star, markRead, archiveToggle } = actions;
  const hue = senderHue(thread.from.email);
  const initials = senderInitials(thread.from.name, thread.from.email);
  const sender = thread.from.name || thread.from.email;
  const isUnread = thread.isUnread;
  const labels = visibleLabels(thread.labels ?? []);
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

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
        "mx-2 my-px px-3 py-2.5 rounded-xl",
        "cursor-pointer select-none transition-colors duration-75",
        isFocused && !isActive && "bg-black/[0.05] dark:bg-white/[0.05]",
        !isFocused &&
          !isActive &&
          "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
        isActive && [
          "bg-black/[0.04] dark:bg-white/[0.06]",
          "before:absolute before:inset-y-[6px] before:left-0 before:w-[2px]",
          "before:bg-zinc-800 dark:before:bg-white/50 before:rounded-r-full",
        ],
      )}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-white tracking-[0.02em]"
        style={{ background: `hsl(${hue} 25% 52%)` }}
      >
        {initials}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "flex-1 min-w-0 truncate leading-none",
              isUnread
                ? "text-[13px] font-semibold text-gray-950 dark:text-white tracking-[-0.015em]"
                : "text-[13px] font-normal text-gray-500 dark:text-white/35 tracking-[-0.01em]",
            )}
          >
            {sender}
          </p>

          <div className="relative flex items-center justify-end shrink-0 h-5">
            <div
              className={cn(
                "flex items-center gap-1.5 transition-opacity duration-100",
                isFocused ? "opacity-0" : "group-hover:opacity-0",
              )}
            >
              {labels.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {labels.slice(0, 3).map((l) => (
                    <LabelDot key={l} label={l} />
                  ))}
                </div>
              )}
              {thread.isStarred && (
                <Star
                  size={10}
                  className="fill-amber-400 text-amber-400 shrink-0"
                />
              )}
              <span
                className={cn(
                  "text-[11px] tabular-nums whitespace-nowrap",
                  isUnread
                    ? "text-gray-500 dark:text-white/42"
                    : "text-gray-400 dark:text-white/22",
                )}
              >
                {formatThreadDate(thread.receivedAt)}
              </span>
            </div>

            <div
              className={cn(
                "absolute right-0 transition-opacity duration-100",
                isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
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

        <p
          className={cn(
            "truncate leading-none tracking-[-0.005em]",
            isUnread
              ? "text-[12.5px] font-normal text-gray-500 dark:text-white/48"
              : "text-[12.5px] font-normal text-gray-400 dark:text-white/25",
          )}
        >
          {thread.subject || "(no subject)"}
        </p>
      </div>
    </div>
  );
}

export const ThreadRow = memo(function ThreadRow(props: ThreadRowProps) {
  return props.mode === "flow" ? (
    <FlowRow {...props} />
  ) : (
    <VelocityRow {...props} />
  );
});
