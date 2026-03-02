"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  IconSparkles,
  IconBolt,
  IconKeyboard,
  IconMessages,
} from "@tabler/icons-react";
import { FeatureShowcase } from "@/components/ui/feature-showcase";

const ITEMS = [
  {
    id: "thread",
    icon: <IconMessages size={15} />,
    label: "Thread view",
    description: "Full conversation with AI summary and smart replies baked in.",
    image: "/dashboardImage.png",
    imageAlt: "betterMail thread view",
    imageWidth: 1400,
    imageHeight: 875,
  },
  {
    id: "velocity",
    icon: <IconBolt size={15} />,
    label: "Velocity mode",
    description: "Blitz through your inbox — keyboard-first, no mouse needed.",
    image: "/velocityModeDashboard.png",
    imageAlt: "betterMail velocity mode",
    imageWidth: 1400,
    imageHeight: 875,
  },
  {
    id: "ai",
    icon: <IconSparkles size={15} />,
    label: "AI everywhere",
    description: "Summaries, smart replies, and drafts — all in one place.",
    image: "/dashboardImage.png",
    imageAlt: "betterMail AI features",
    imageWidth: 1400,
    imageHeight: 875,
  },
  {
    id: "shortcuts",
    icon: <IconKeyboard size={15} />,
    label: "Keyboard-first",
    description: "j k r e s # and more. Every action, one keystroke away.",
    image: "/velocityModeDashboard.png",
    imageAlt: "betterMail keyboard shortcuts",
    imageWidth: 1400,
    imageHeight: 875,
  },
];

export function DashboardSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-28">
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.047) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white" />

      {/* ── Header ── */}
      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-xl px-6 text-center mb-12 md:mb-16"
      >
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[2.4rem] md:text-[3.2rem] font-instrument leading-[1.06] tracking-[-0.03em] bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 to-neutral-500"
        >
          What email should<br />feel like.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-3 text-[15px] text-neutral-400 leading-relaxed"
        >
          Multi-account. AI summaries. Smart replies. Keyboard shortcuts.
        </motion.p>
      </div>

      {/* ── Feature showcase ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto max-w-6xl px-6 md:px-8"
      >
        <FeatureShowcase items={ITEMS} chrome chromeUrl="app.bettermail.com" />
      </motion.div>
    </section>
  );
}
