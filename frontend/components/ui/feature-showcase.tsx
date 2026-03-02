"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShowcaseItem {
  id: string;
  /** Tab label */
  persona: string;
  /** Small eyebrow text above the headline */
  eyebrow: string;
  /** Large headline — use \n for line breaks */
  headline: string;
  /** Supporting paragraph */
  description: string;
  /** Outcome line at the bottom */
  outcome: string;
  /** Image source path */
  image: string;
  imageAlt?: string;
}

export interface FeatureShowcaseProps {
  items: ShowcaseItem[];
  className?: string;
}

// ─── Dot-pattern backdrop ─────────────────────────────────────────────────────
function DotPattern() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="sp-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" className="fill-neutral-300/80 dark:fill-white/10" />
        </pattern>
        <radialGradient id="sp-dot-fade" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="white" stopOpacity="1" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="sp-dot-mask">
          <rect width="100%" height="100%" fill="url(#sp-dot-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#sp-dots)" mask="url(#sp-dot-mask)" />
    </svg>
  );
}

// ─── Right: image inside dot-pattern panel ────────────────────────────────────
function ImagePanel({ current, direction }: { current: ShowcaseItem; direction: number }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-neutral-100 dark:bg-neutral-900/80",
        "ring-1 ring-black/7 dark:ring-white/6",
      )}
    >
      <DotPattern />

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={{
            enter: (d: number) => ({ opacity: 0, y: d * 14 }),
            center:             { opacity: 1, y: 0 },
            exit:  (d: number) => ({ opacity: 0, y: d * -14 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 p-6 pb-8"
        >
          <div
            className={cn(
              "relative w-full aspect-16/10 rounded-xl overflow-hidden",
              "ring-1 ring-black/8 dark:ring-white/7",
              "shadow-[0_24px_64px_rgba(0,0,0,0.16),0_4px_12px_rgba(0,0,0,0.08)]",
              "dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)]",
            )}
          >
            <Image
              src={current.image}
              alt={current.imageAlt ?? current.persona}
              fill
              className="object-cover object-top"
              quality={95}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Left: copy panel ─────────────────────────────────────────────────────────
function CopyPanel({ current, direction }: { current: ShowcaseItem; direction: number }) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={current.id}
        custom={direction}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: d * -20 }),
          center:             { opacity: 1, x: 0 },
          exit:  (d: number) => ({ opacity: 0, x: d * 20 }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col gap-5 py-2"
      >
        {/* Eyebrow */}
        <p className="text-[11px] font-mono tracking-[0.12em] uppercase text-neutral-400 dark:text-white/35">
          {current.eyebrow}
        </p>

        {/* Headline */}
        <h3 className="text-[2rem] leading-[1.15] font-semibold tracking-[-0.03em] text-neutral-900 dark:text-white font-instrument whitespace-pre-line">
          {current.headline}
        </h3>

        {/* Description */}
        <p className="text-[14px] leading-relaxed text-neutral-500 dark:text-white/45 max-w-xs">
          {current.description}
        </p>

        {/* Outcome */}
        <div className="mt-2 pt-4 border-t border-black/6 dark:border-white/7">
          <p className="text-[12.5px] text-neutral-500 dark:text-white/40">
            <span className="font-semibold text-neutral-800 dark:text-white/80">Outcome: </span>
            {current.outcome}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function FeatureShowcase({ items, className }: FeatureShowcaseProps) {
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
    <div className={cn("flex flex-col gap-8", className)}>

      {/* Persona pill tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wide uppercase transition-all duration-150 outline-none cursor-pointer",
                isActive
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-white/35 hover:text-neutral-600 dark:hover:text-white/55",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sp-persona-pill"
                  className="absolute inset-0 rounded-full bg-black/6 dark:bg-white/10 ring-1 ring-black/8 dark:ring-white/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{item.persona}</span>
            </button>
          );
        })}
      </div>

      {/* Copy left · Image right */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_8fr] gap-10 lg:gap-14 items-center">
        <CopyPanel current={current} direction={direction} />
        <ImagePanel current={current} direction={direction} />
      </div>

    </div>
  );
}
