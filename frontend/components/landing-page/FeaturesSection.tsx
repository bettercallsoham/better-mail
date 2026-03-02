import { cn } from "@/lib/utils";
import { Gauge, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ViewTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  image: string;
  alt: string;
}

// ─── Dot-pattern backdrop (reused from your existing component) ───────────────
function DotPattern() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="feat-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" className="fill-neutral-300/60 dark:fill-white/10" />
        </pattern>
        <radialGradient id="feat-dot-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="60%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="feat-dot-mask">
          <rect width="100%" height="100%" fill="url(#feat-dot-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#feat-dots)" mask="url(#feat-dot-mask)" />
    </svg>
  );
}

// ─── Tab switcher with animated sliding underline ─────────────────────────────
function TabSwitcher({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: ViewTab[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-neutral-100 dark:bg-white/[0.06] ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 outline-none cursor-pointer select-none",
              isActive
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-400 dark:text-white/35 hover:text-neutral-600 dark:hover:text-white/55",
            )}
          >
            {/* Animated pill background */}
            {isActive && (
              <motion.div
                layoutId="feat-tab-bg"
                className="absolute inset-0 rounded-lg bg-white dark:bg-white/[0.1] shadow-sm ring-1 ring-black/[0.07] dark:ring-white/[0.08]"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main updated component ───────────────────────────────────────────────────
export default function FeaturesShowCaseBettermail() {
  const tabs: ViewTab[] = [
    {
      id: "Flow Mode",
      label: "Flow Mode",
      icon: <Gauge className="w-3.5 h-3.5" />,
      image: "/dashboardImage.png",
      alt: "BetterMail default inbox view",
    },
    {
      id: "velocity",
      label: "Velocity Mode",
      icon: <Zap className="w-3.5 h-3.5" />,
      image: "/velocityModeDashboard.png",
      alt: "BetterMail velocity mode",
    },
  ];

  const [activeId, setActiveId] = useState(tabs[0].id);
  const [direction, setDirection] = useState(1);

  const currentIdx = tabs.findIndex((t) => t.id === activeId);
  const current = tabs[currentIdx];

  const handleSelect = (id: string) => {
    if (id === activeId) return;
    const nextIdx = tabs.findIndex((t) => t.id === id);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    setActiveId(id);
  };

  return (
    <section className="w-full px-20 bg-neutral-00 mx-auto sm:px-6 lg:px-30 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-12 lg:gap-16 items-center">

        {/* ── Left: Copy ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:max-w-sm">
      

          {/* Headline */}
          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl  font-semibold tracking-tight leading-[1.05] text-neutral-950 dark:text-white">
              Email that
            </h2>
            <h2 className="text-4xl sm:text-5xl font-normal font-instrument tracking-tight leading-[1.05] bg-clip-text text-transparent bg-gradient-to-br from-neutral-900 via-neutral-600 to-neutral-400 dark:from-white dark:via-white/70 dark:to-white/30">
              thinks with you.
            </h2>
          </div>

          {/* Body */}
          <p className="text-[15px] leading-relaxed text-neutral-500 dark:text-white/45">
         
            Switch between a calm default view or engage{" "}
            <span className="text-neutral-700 dark:text-white/70 font-medium">
              Velocity Mode
            </span>{" "}
            when it's time to hit inbox zero fast.
          </p>

         

          {/* CTA */}
          <div className="flex items-center gap-3 pt-1">
            <button className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[13px] font-semibold tracking-[-0.01em] hover:bg-neutral-700 dark:hover:bg-white/90 transition-colors duration-150 shadow-sm">
             Get Started
            </button>
          
          </div>
        </div>

        {/* ── Right: Image Panel ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Tab switcher — top right aligned */}
          <div className="flex justify-end">
            <TabSwitcher tabs={tabs} activeId={activeId} onSelect={handleSelect} />
          </div>

          {/* Image container */}
          <div
            className={cn(
              "relative rounded-2xl overflow-hidden",
              "bg-neutral-100 dark:bg-neutral-900/80",
              "ring-1 ring-black/[0.07] dark:ring-white/[0.06]",
              "aspect-[16/10] w-full",
            )}
          >
            <DotPattern />

            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, x: dir * 24, scale: 0.98 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (dir: number) => ({ opacity: 0, x: dir * -24, scale: 0.98 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute inset-0 flex items-center justify-center p-5 sm:p-7 z-10"
              >
                <div
                  className={cn(
                    "relative w-full h-full rounded-xl overflow-hidden",
                    "ring-1 ring-black/[0.09] dark:ring-white/[0.07]",
                    "shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]",
                    "dark:shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]",
                  )}
                >
                  <Image
                    src={current.image}
                    alt={current.alt}
                    fill
                    className="object-contain object-top"
                    quality={95}
                    priority
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom outcome label */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id + "-label"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md ring-1 ring-black/[0.08] dark:ring-white/[0.08] shadow-sm"
                >
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-white/50">
                    Outcome:
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-800 dark:text-white/80">
                    {current.id === "velocity"
                      ? "Inbox zero in minutes, not hours."
                      : "Calm, focused, and in control."}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}