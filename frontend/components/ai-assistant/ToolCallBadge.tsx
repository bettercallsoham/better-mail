"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconSearch,
  IconMail,
  IconUsers,
  IconFileText,
  IconBrain,
  IconLoader2,
  IconPaperclip,
  IconList,
} from "@tabler/icons-react";

const TOOL_META: Record<string, { icon: React.ElementType; texts: string[] }> =
  {
    search_emails: {
      icon: IconSearch,
      texts: ["Scanning inbox...", "Filtering messages...", "Almost there..."],
    },
    search_threads: {
      icon: IconSearch,
      texts: ["Looking through threads...", "Finding matches..."],
    },
    search_knowledge_and_history: {
      icon: IconBrain,
      texts: [
        "Recalling context...",
        "Searching memory...",
        "Connecting dots...",
      ],
    },
    get_thread: {
      icon: IconMail,
      texts: ["Opening thread...", "Reading emails..."],
    },
    get_email: {
      icon: IconMail,
      texts: ["Reading email...", "Processing content..."],
    },
    get_email_content: {
      icon: IconMail,
      texts: ["Reading email...", "Processing content...", "Almost done..."],
    },
    get_contacts: {
      icon: IconUsers,
      texts: ["Finding contacts...", "Checking address book..."],
    },
    summarize_thread: {
      icon: IconFileText,
      texts: [
        "Summarizing...",
        "Reading carefully...",
        "Extracting key points...",
      ],
    },
    list_threads: {
      icon: IconList,
      texts: ["Loading inbox...", "Fetching threads..."],
    },
    find_attachments: {
      icon: IconPaperclip,
      texts: ["Scanning attachments...", "Checking files..."],
    },
    analyze_email: {
      icon: IconBrain,
      texts: ["Analyzing...", "Processing context...", "Almost done..."],
    },
    default: {
      icon: IconLoader2,
      texts: ["Thinking...", "Processing...", "Almost there..."],
    },
  };

function getMeta(tool: string) {
  return TOOL_META[tool] ?? TOOL_META.default;
}

// Shimmer cycling text — same effect as AITextLoading but scales to badge size
function CyclingText({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % texts.length), 1600);
    return () => clearInterval(id);
  }, [texts.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 6 }}
        animate={{
          opacity: 1,
          y: 0,
          backgroundPosition: ["200% center", "-200% center"],
        }}
        exit={{ opacity: 0, y: -6 }}
        transition={{
          opacity: { duration: 0.22 },
          y: { duration: 0.22 },
          backgroundPosition: {
            duration: 2.2,
            ease: "linear",
            repeat: Infinity,
          },
        }}
        className="text-[11px] font-medium bg-linear-to-r from-amber-700 via-amber-500 to-amber-700 dark:from-amber-300 dark:via-amber-500 dark:to-amber-300 bg-[length:200%_100%] bg-clip-text text-transparent whitespace-nowrap"
      >
        {texts[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

interface ToolCallBadgeProps {
  tool: string | null;
}

export function ToolCallBadge({ tool }: ToolCallBadgeProps) {
  return (
    <AnimatePresence>
      {tool &&
        (() => {
          const meta = getMeta(tool);
          const Icon = meta.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mb-2.5"
            >
              <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-400/6 border border-amber-200 dark:border-amber-400/15">
                <Icon
                  size={11}
                  className="text-amber-500 dark:text-amber-400 shrink-0 animate-spin"
                  style={{ animationDuration: "2.5s" }}
                />
                <CyclingText texts={meta.texts} />
              </span>
            </motion.div>
          );
        })()}
    </AnimatePresence>
  );
}
