"use client";

import { Suspense, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUIStore, useAIStore } from "@/lib/store/ui.store";
import { ThreadList } from "@/components/dashboard/thread-view/threadList/ThreadList";
import { ThreadDetail } from "@/components/dashboard/thread-view/ThreadDetail";
import { SenderPane } from "@/components/dashboard/thread-view/SenderPane";
import { ThreadSideSheet } from "@/components/dashboard/thread-view/ThreadSheet";
import { AIAssistantFullscreen } from "@/components/ai-assistant/AIAssistantFullscreen";
import { cn } from "@/lib/utils";
import { UrlParamsSync } from "@/hooks/useUrlParamsSync";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MIN_SPLIT: Record<string, number> = { velocity: 45, flow: 32 };
const MAX_SPLIT: Record<string, number> = { velocity: 75, flow: 60 };
/** Fallback default — store already seeds these but used as clamp reference */
const DEFAULT_SPLIT: Record<string, number> = { velocity: 62, flow: 42 };

// ─────────────────────────────────────────────────────────────────────────────
// useIsMobile — SSR-safe via useSyncExternalStore
//
// Three arguments:
//   1. subscribe        — attaches / detaches the MediaQueryList listener
//   2. getSnapshot      — returns the live client value
//   3. getServerSnapshot — returned during SSR; false = render desktop on
//                          server so initial paint matches hydration
//
// This replaces useState + useEffect which caused:
//   "Calling setState synchronously within an effect" warning.
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    () => false,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile layout
// ─────────────────────────────────────────────────────────────────────────────

function MobileLayout() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const showDetail = !!activeThreadId;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Thread list — slides left when detail opens */}
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-300 ease-in-out",
          showDetail ? "-translate-x-full" : "translate-x-0",
        )}
      >
        <ThreadList className="h-full" />
      </div>

      {/* Detail pane — slides in from right */}
      <div
        className={cn(
          "absolute inset-0 bg-white dark:bg-neutral-950",
          "transition-transform duration-300 ease-in-out",
          showDetail ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Back button */}
        <div className="flex items-center gap-2 px-4 h-11 border-b border-black/6 dark:border-white/6 shrink-0">
          <button
            onClick={() => setActiveThread(null)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
          >
            <svg
              width="8"
              height="13"
              viewBox="0 0 8 13"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M7 1L1.5 6.5L7 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Inbox
          </button>
        </div>

        <div className="h-[calc(100%-44px)] overflow-hidden">
          {layoutMode === "flow" ? (
            <ThreadDetail className="h-full" />
          ) : (
            <SenderPane className="h-full" />
          )}
        </div>
      </div>

      {/* Side sheet handles velocity + zen on mobile too */}
      <ThreadSideSheet />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop layout
// ─────────────────────────────────────────────────────────────────────────────

function DesktopLayout() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  // ── Persisted split — read from store (hydrated from localStorage) ─────────
  const storedSplit = useUIStore((s) => s.splitPct);
  const setSplitPct = useUIStore((s) => s.setSplitPct);

  // Clamp whatever is in the store into valid range for this mode
  const rawPct = storedSplit[layoutMode] ?? DEFAULT_SPLIT[layoutMode] ?? 50;
  const splitPct = Math.max(
    MIN_SPLIT[layoutMode] ?? 40,
    Math.min(MAX_SPLIT[layoutMode] ?? 70, rawPct),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // Transient split held in a ref during drag — avoids triggering Zustand
  // (and its localStorage persist) on every mousemove tick (60-120/s).
  const liveSplitRef = useRef(splitPct);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    let rafId = 0;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const min = MIN_SPLIT[layoutMode] ?? 40;
      const max = MAX_SPLIT[layoutMode] ?? 70;
      liveSplitRef.current = Math.max(min, Math.min(max, pct));
      // Apply visual update via RAF — no Zustand/localStorage write yet.
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (containerRef.current) {
          const listEl = containerRef.current
            .firstElementChild as HTMLElement | null;
          if (listEl) listEl.style.width = `${liveSplitRef.current}%`;
        }
      });
    };

    const onUp = () => {
      dragging.current = false;
      cancelAnimationFrame(rafId);
      // Persist to store exactly once — triggered on mouseup, not per pixel.
      setSplitPct(layoutMode, liveSplitRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Zen mode — list only, side sheet opens over it ───────────────────────
  if (layoutMode === "zen") {
    return (
      <>
        <ThreadList className="h-full" />
        <ThreadSideSheet />
      </>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left — thread list */}
      <div
        className="h-full overflow-hidden shrink-0"
        style={{ width: `${splitPct}%` }}
      >
        <ThreadList className="h-full" />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        className={cn(
          "relative w-px bg-black/6 dark:bg-white/6 shrink-0 cursor-col-resize",
          "hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors duration-150",
          // Widen the hit area without affecting layout
          "after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-['']",
        )}
      />

      {/* Right — detail / sender pane */}
      <div className="flex-1 h-full overflow-hidden min-w-0">
        {layoutMode === "flow" ? (
          <ThreadDetail className="h-full" />
        ) : (
          <SenderPane className="h-full" />
        )}
      </div>

      {/*
        ThreadSideSheet — renders as a portal so it's outside this flex container.
        In velocity mode it slides in from the right edge of the viewport,
        sitting on top of the SenderPane area.
      */}
      <ThreadSideSheet />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function AppPage() {
  const isMobile = useIsMobile(768);
  const { aiMode } = useAIStore();

  return (
    <>
      <Suspense fallback={null}>
        <UrlParamsSync />
      </Suspense>

      <AnimatePresence mode="wait">
        {aiMode ? (
          <motion.div
            key="ai-mode"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AIAssistantFullscreen />
          </motion.div>
        ) : (
          <motion.div
            key="inbox"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {isMobile ? <MobileLayout /> : <DesktopLayout />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
