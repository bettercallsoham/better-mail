"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// ─── Public types ──────────────────────────────────────────────────────────────
export interface ShowcaseItem {
  id: string;
  /** Small icon rendered inside the badge */
  icon: React.ReactNode;
  /** Short feature name */
  label: string;
  /** One-line description shown below the label */
  description: string;
  /** Image source path */
  image: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface FeatureShowcaseProps {
  items: ShowcaseItem[];
  className?: string;
  /** Wrap the image in a macOS-style app window chrome */
  chrome?: boolean;
  chromeUrl?: string;
  /** Custom class applied to the image element */
  imageClassName?: string;
}

// ─── Image panel — handles the transition ─────────────────────────────────────
function ImagePanel({
  current,
  direction,
  chrome,
  chromeUrl,
  imageClassName,
}: {
  current: ShowcaseItem;
  direction: number;
  chrome: boolean;
  chromeUrl: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "ring-1 ring-black/[0.08] dark:ring-white/[0.07]",
        "shadow-[0_16px_56px_rgba(0,0,0,0.13),0_3px_10px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_16px_56px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.05)]",
      )}
    >
      {/* macOS chrome */}
      {chrome && (
        <div className="flex items-center gap-5 bg-neutral-100 dark:bg-[#1e1c1a] px-4 py-[10px] border-b border-black/[0.07] dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 justify-center">
            <div className="flex items-center gap-1.5 bg-white/75 dark:bg-white/[0.07] rounded-md px-3 py-[4px] text-[11px] text-neutral-400 dark:text-white/30 border border-black/[0.07] dark:border-white/[0.07] min-w-[140px] justify-center">
              <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shrink-0" />
              {chromeUrl}
            </div>
          </div>
          <div className="w-[44px]" />
        </div>
      )}

      {/* Direction-aware crossfade */}
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={{
            enter: (dir: number) => ({ opacity: 0, y: dir * 18 }),
            center: { opacity: 1, y: 0 },
            exit: (dir: number) => ({ opacity: 0, y: dir * -18 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Image
            src={current.image}
            alt={current.imageAlt ?? current.label}
            width={current.imageWidth ?? 1200}
            height={current.imageHeight ?? 750}
            className={cn("w-full h-auto block", imageClassName)}
            quality={95}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function FeatureShowcase({
  items,
  className,
  chrome = false,
  chromeUrl = "app.bettermail.com",
  imageClassName,
}: FeatureShowcaseProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [direction, setDirection] = useState(1);

  const currentIdx = items.findIndex((i) => i.id === activeId);
  const current = items[currentIdx] ?? items[0];

  const handleSelect = (id: string) => {
    if (id === activeId) return;
    const nextIdx = items.findIndex((i) => i.id === id);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    setActiveId(id);
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-[5fr_8fr] gap-6 lg:gap-10 items-center",
        className,
      )}
    >
      {/* ── Left: feature list ── */}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "group relative flex items-start gap-3 px-3.5 py-3 rounded-xl text-left transition-colors duration-150 outline-none",
                isActive
                  ? "bg-black/[0.04] dark:bg-white/[0.06]"
                  : "hover:bg-black/[0.025] dark:hover:bg-white/[0.03]",
              )}
            >
              {/* Sliding left-edge indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="showcase-bar"
                  className="absolute left-0 inset-y-2.5 w-[2.5px] rounded-full bg-neutral-900 dark:bg-white"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}

              {/* Icon badge */}
              <div
                className={cn(
                  "mt-[1px] w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150",
                  isActive
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                    : "bg-neutral-100 dark:bg-white/[0.07] text-neutral-400 dark:text-white/35",
                )}
              >
                {item.icon}
              </div>

              {/* Label + description */}
              <div className="min-w-0 pt-[1px]">
                <p
                  className={cn(
                    "text-[13px] font-semibold leading-snug tracking-[-0.01em] transition-colors duration-150",
                    isActive
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-500 dark:text-white/40",
                  )}
                >
                  {item.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] leading-relaxed transition-colors duration-150",
                    isActive
                      ? "text-neutral-500 dark:text-white/40"
                      : "text-neutral-400 dark:text-white/25",
                  )}
                >
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right: image panel ── */}
      <ImagePanel
        current={current}
        direction={direction}
        chrome={chrome}
        chromeUrl={chromeUrl}
        imageClassName={imageClassName}
      />
    </div>
  );
}
