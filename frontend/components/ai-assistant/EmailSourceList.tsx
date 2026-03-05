"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { EmailSourceCard } from "./EmailSourceCard";
import type { MessageSource } from "@/features/conversations/conversations.type";

const SHOW_INITIALLY = 3;

interface EmailSourceListProps {
  sources: MessageSource[];
}

export function EmailSourceList({ sources }: EmailSourceListProps) {
  const [expanded, setExpanded] = useState(false);

  // Only count/show sources that have a threadId (otherwise EmailSourceCard renders null)
  const renderable = sources.filter(
    (s) => (s.metadata?.threadId as string | undefined) ?? s.emailId,
  );

  if (renderable.length === 0) return null;

  const showAll = expanded || renderable.length <= SHOW_INITIALLY;
  const visible = showAll ? renderable : renderable.slice(0, SHOW_INITIALLY);
  const hiddenCount = renderable.length - SHOW_INITIALLY;

  return (
    <div className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-white/8">
      <p className="text-[10px] font-medium text-neutral-400 dark:text-white/25 uppercase tracking-[0.08em] px-2 mb-1">
        {renderable.length === 1 ? "1 source" : `${renderable.length} sources`}
      </p>

      <div>
        {visible.map((source, i) => (
          <EmailSourceCard key={source.emailId ?? i} source={source} />
        ))}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 mt-0.5 px-2 py-1 text-[11px] text-neutral-400 dark:text-white/25 hover:text-neutral-600 dark:hover:text-white/55 transition-colors cursor-pointer"
        >
          <IconChevronDown size={11} />
          {hiddenCount} more
        </button>
      )}

      {expanded && renderable.length > SHOW_INITIALLY && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 mt-0.5 px-2 py-1 text-[11px] text-neutral-400 dark:text-white/25 hover:text-neutral-600 dark:hover:text-white/55 transition-colors cursor-pointer"
        >
          <IconChevronDown size={11} className="rotate-180" />
          Show less
        </button>
      )}
    </div>
  );
}
