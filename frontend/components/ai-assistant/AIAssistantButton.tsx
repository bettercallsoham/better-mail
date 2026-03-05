"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { IconX } from "@tabler/icons-react";
import { useAIStore } from "@/lib/store/ui.store";

const TOOLTIP_CHIPS = [
  "Search emails",
  "Summarize threads",
  "Draft replies",
  "Find invoices",
];

export function AIAssistantButton() {
  const { aiAssistantOpen, aiMode, setAIAssistantOpen, setAIMode } =
    useAIStore();
  const [hovered, setHovered] = useState(false);

  if (aiMode) {
    return (
      <motion.button
        onClick={() => setAIMode(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-semibold text-neutral-500 dark:text-white/70 hover:text-neutral-700 dark:hover:text-white border border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20 bg-white/90 dark:bg-[#111009]/95 transition-colors shadow-md dark:shadow-none"
        style={{ backdropFilter: "blur(16px)" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Exit AI mode"
      >
        <IconX size={14} />
        Exit AI mode
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="pointer-events-none w-56 rounded-2xl p-4 bg-white dark:bg-[#1a1710] border border-neutral-200/80 dark:border-white/10 shadow-xl dark:shadow-none"
          >
            <p className="text-[13px] font-semibold text-neutral-800 dark:text-white/90 leading-snug mb-1">
              Your inbox, finally understood.
            </p>
            <p className="text-[11.5px] text-neutral-500 dark:text-white/40 leading-relaxed mb-3">
              Ask anything. Find anything. Do anything.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TOOLTIP_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-white/45 border border-neutral-200 dark:border-white/8"
                >
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main button ──────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setAIAssistantOpen(!aiAssistantOpen)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-[#1a1710] border border-neutral-200 dark:border-white/10 hover:border-amber-400/50 dark:hover:border-amber-500/35 shadow-lg dark:shadow-none transition-colors overflow-hidden"
        style={{ backdropFilter: "blur(16px)" }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={
          aiAssistantOpen ? "Close AI assistant" : "Open AI assistant"
        }
      >
        <Image
          src="/logo.png"
          alt="BetterMail AI"
          width={28}
          height={28}
          className="object-contain dark:invert"
          priority={false}
        />
      </motion.button>
    </div>
  );
}
