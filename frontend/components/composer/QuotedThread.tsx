"use client";

import { useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface QuotedThreadProps {
  html:       string;
  className?: string;
}

export function QuotedThread({ html, className }: QuotedThreadProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("mt-2", className)}>
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
          "text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/45",
          "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
          expanded && "text-gray-600 dark:text-white/45",
        )}
        title={expanded ? "Collapse quoted text" : "Show quoted text"}
      >
        <IconDots size={14} />
      </button>

      {expanded && (
        <div
          className={cn(
            "mt-2 pl-3 border-l-2 border-gray-200 dark:border-white/[0.1]",
            "text-[12.5px] text-gray-500 dark:text-white/35",
            "prose prose-sm max-w-none",
            "[&_*]:text-gray-500 dark:[&_*]:text-white/35",
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}