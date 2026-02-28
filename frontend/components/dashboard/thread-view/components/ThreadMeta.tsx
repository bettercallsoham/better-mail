"use client";

import { useState, useCallback } from "react";
import {
  IconUser, IconTag, IconBell, IconMessages,
  IconLayoutList, IconAlertTriangle, IconCopy, IconCheck,
} from "@tabler/icons-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmailAvatar } from "./EmailAvatar";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { cn } from "@/lib/utils";

// ─── Label metadata ────────────────────────────────────────────────────────────
const LABEL_META: Record<string, {
  icon: React.ReactNode; name: string;
  bg: string; text: string;
}> = {
  CATEGORY_PERSONAL:   { icon: <IconUser size={11} />,          bg: "rgba(99,102,241,0.12)",  text: "#818cf8", name: "Personal"   },
  CATEGORY_PROMOTIONS: { icon: <IconTag size={11} />,           bg: "rgba(255,255,255,0.07)", text: "rgba(255,255,255,0.42)", name: "Promotions" },
  CATEGORY_UPDATES:    { icon: <IconBell size={11} />,          bg: "rgba(100,116,139,0.14)", text: "#94a3b8", name: "Updates"    },
  CATEGORY_SOCIAL:     { icon: <IconMessages size={11} />,      bg: "rgba(16,185,129,0.13)",  text: "#34d399", name: "Social"     },
  CATEGORY_FORUMS:     { icon: <IconLayoutList size={11} />,    bg: "rgba(139,92,246,0.13)",  text: "#a78bfa", name: "Forums"     },
  IMPORTANT:           { icon: <IconAlertTriangle size={11} />, bg: "rgba(217,119,6,0.14)",   text: "#fbbf24", name: "Important"  },
};
const HIDDEN_LABELS = new Set(["INBOX", "UNREAD", "SENT", "DRAFT", "TRASH", "SPAM"]);

function LabelDot({ label }: { label: string }) {
  const meta = LABEL_META[label];
  if (!meta) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="w-[20px] h-[20px] rounded-full flex items-center justify-center cursor-default"
            style={{ backgroundColor: meta.bg, color: meta.text }}
          >
            {meta.icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom"><span className="text-[11px]">{meta.name}</span></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ParticipantPill({ name, email }: { name?: string; email: string }) {
  const [copied, setCopied] = useState(false);
  const displayName = name || email.split("@")[0];

  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [email]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors cursor-default">
            <EmailAvatar name={name} email={email} size={6} />
            <span className="text-[11.5px] font-medium text-gray-600 dark:text-white/52 max-w-[90px] truncate">
              {displayName}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2 py-1.5 px-2.5">
          <span className="text-[11px]">{email}</span>
          <button onClick={copy} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
            {copied ? <IconCheck size={12} className="text-emerald-500" /> : <IconCopy size={12} />}
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
interface ThreadMetaProps {
  emails:    FullEmail[];
  dateRange: string;
  className?: string;
}

export function ThreadMeta({ emails, dateRange, className }: ThreadMetaProps) {
  const allLabels = [
    ...new Set(emails.flatMap(e => (e.labels ?? []).filter(l => !HIDDEN_LABELS.has(l))))
  ];

  const seen         = new Set<string>();
  const participants = emails.filter(e => {
    if (seen.has(e.from.email)) return false;
    seen.add(e.from.email);
    return true;
  });

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-[11.5px] text-gray-400 dark:text-white/28 tabular-nums shrink-0">
        {dateRange}
      </span>
      <Dot />
      <span className="text-[11.5px] text-gray-400 dark:text-white/28 shrink-0">
        {emails.length} {emails.length === 1 ? "message" : "messages"}
      </span>

      {allLabels.length > 0 && (
        <>
          <Dot />
          <div className="flex items-center gap-1">
            {allLabels.slice(0, 4).map(l => <LabelDot key={l} label={l} />)}
          </div>
        </>
      )}

      {participants.length > 0 && (
        <>
          <Dot />
          <div className="flex items-center gap-1 flex-wrap">
            {participants.slice(0, 4).map(e => (
              <ParticipantPill key={e.from.email} name={e.from.name} email={e.from.email} />
            ))}
            {participants.length > 4 && (
              <span className="text-[11px] text-gray-400 dark:text-white/25">
                +{participants.length - 4}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Dot() {
  return <span className="text-gray-200 dark:text-white/12 text-[10px] shrink-0">·</span>;
}