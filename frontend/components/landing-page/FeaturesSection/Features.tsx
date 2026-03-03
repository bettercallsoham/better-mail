"use client";

import cn from "clsx";
import {
  BrainIcon,
  KeyboardIcon,
  SparklesIcon,
  Check,
  Mail,
  Archive,
  Reply,
  Search,
  Star,
  FileTextIcon,
  CheckSquare,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import Image from "next/image";
import { AnimatedBeam } from "../../ui/animated-beam";

export default function Bento() {
  return (
    <div
      id="features"
      className="flex flex-col gap-10 items-center justify-center bg-neutral-50 py-10 sm:py-20"
    >
      <div className="w-full max-w-4xl px-2 sm:px-4">
        <h1 className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-950 to-neutral-400 dark:from-neutral-50 dark:to-neutral-400 text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-instrument leading-tight">
          Built For Power Users
        </h1>
        <h3 className="text-neutral-500 dark:text-neutral-400 font-normal tracking-tight leading-tight text-sm sm:text-base md:text-lg mt-3 sm:mt-4 font-sans text-center px-4">
          Triage, prioritize, and automate your inbox
        </h3>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-0">
        <div className="border border-neutral-200 bg-gray-100 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
            {/* Keyboard Shortcuts Card */}
            <Card>
              <CardHeader>
                <KeyboardIcon className="w-5 h-5" />
                <CardTitle>Lightning Fast Navigation</CardTitle>
              </CardHeader>
              <CardDescription>
                Navigate your entire inbox with keyboard shortcuts. Archive,
                snooze, reply, or label emails without touching your mouse.
              </CardDescription>
              <CardSkeleton>
                <KeyboardShortcutsSkeleton />
              </CardSkeleton>
            </Card>

            {/* Smart Classification Card */}
            <Card>
              <CardHeader>
                <SparklesIcon className="w-5 h-5" />
                <CardTitle>Smart Replies</CardTitle>
              </CardHeader>
              <CardDescription>
                Instantly generate smart, context-aware replies to emails. Save
                time with AI-suggested responses tailored to each conversation.
              </CardDescription>
              <CardSkeleton>
                <ContextAwareRepliesSkeleton />
              </CardSkeleton>
            </Card>

            {/* AI Agent Workflows - Full Width */}
            <Card className="md:col-span-2 border-t md:border-t-0">
              <CardHeader>
                <BrainIcon className="w-5 h-5" />
                <CardTitle>AI Agent Workflows</CardTitle>
              </CardHeader>
              <CardDescription>
                Your AI assistant can draft replies, schedule meetings, extract
                action items, and automate complex workflows - all from your
                inbox.
              </CardDescription>
              <CardSkeleton className="h-80 md:h-96 bg-[radial-gradient(rgb(0,0,0,0.1)_1px,transparent_1px)] ">
                <AIWorkflowSkeleton />
              </CardSkeleton>
            </Card>

            {/* Templates Card */}
            <Card className="border-t md:border-t-0">
              <CardHeader>
                <FileTextIcon className="w-5 h-5" />
                <CardTitle>Reusable Templates</CardTitle>
              </CardHeader>
              <CardDescription>
                Create email templates with dynamic variables. Personalize at
                scale &mdash; define{" "}
                <span className="font-mono text-xs text-amber-500">
                  {"{{first_name}}"}
                </span>{" "}
                and betterMail fills it in automatically.
              </CardDescription>
              <CardSkeleton>
                <TemplatesSkeleton />
              </CardSkeleton>
            </Card>

            {/* AI Compose Card */}
            <Card className="border-t md:border-t-0">
              <CardHeader>
                <SparklesIcon className="w-5 h-5" />
                <CardTitle>AI Email Composer</CardTitle>
              </CardHeader>
              <CardDescription>
                Rewrite, fix grammar, change tone, or shorten any draft in one
                click. Your AI writing assistant lives right in the composer.
              </CardDescription>
              <CardSkeleton>
                <AIComposeSkeleton />
              </CardSkeleton>
            </Card>

          
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= MODULE-SCOPE CONSTANTS (allocated once, never re-created) =====

const SHORTCUTS = [
  { icon: <Mail size={15} />, action: "Compose new email", keys: ["⌘", "N"] },
  { icon: <Archive size={15} />, action: "Archive selected", keys: ["E"] },
  { icon: <Star size={15} />, action: "Mark as important", keys: ["⌘", "I"] },
  { icon: <Search size={15} />, action: "Search emails", keys: ["⌘", "F"] },
  { icon: <Reply size={15} />, action: "Reply", keys: ["R"] },
];

const REPLIES = [
  "Absolutely, 3pm works perfectly for me. I'll update the invite.",
  "No problem at all, 3pm is great!",
  "3pm works! I'll update the invite.",
];

const TEMPLATE_EXAMPLES = [
  {
    first_name: "Jethalal",
    last_name: "Gada",
    motivation_quote: "Jalebi fafda is lub",
  },
  {
    first_name: "Munni",
    last_name: "Badnam",
    motivation_quote: "Bechke khaye aam",
  },
  {
    first_name: "Abhi",
    last_name: "Sharma",
    motivation_quote: "Milking bettermail",
  },
];

// ============= FRAMER MOTION VARIANTS (defined once at module scope) =========

const shortcutRowVariants = {
  rest: { backgroundColor: "rgba(0,0,0,0)", scale: 1 },
  hover: { backgroundColor: "rgba(0,0,0,0.02)", scale: 1.005 },
};
const shortcutIconVariants = {
  rest: { color: "#a3a3a3" },
  hover: { color: "#525252" },
};
const shortcutTextVariants = {
  rest: { color: "#737373" },
  hover: { color: "#262626" },
};
const cleanKeyVariants = {
  rest: {
    y: 0,
    borderColor: "#e5e5e5",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  hover: {
    y: 0.5,
    borderColor: "#d4d4d4",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
};
const cleanKeyTextVariants = {
  rest: { color: "#737373" },
  hover: { color: "#525252" },
};
const replyBgVariants = {
  rest: {
    backgroundColor: "rgba(255,255,255,0.4)",
    borderColor: "rgba(0,0,0,0.04)",
  },
  hover: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(0,0,0,0.08)",
  },
};
const replyGradientVariants = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
};
const replyArrowVariants = {
  rest: { opacity: 0, x: -4 },
  hover: { opacity: 1, x: 0 },
};
const replyLiftVariants = {
  rest: { y: 0 },
  hover: { y: -2 },
};

// ============= SKELETON COMPONENTS =============

// Premium Keyboard Shortcuts Skeleton - Truly Minimal
const KeyboardShortcutsSkeleton = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <div ref={containerRef} className="h-full w-full p-6 flex flex-col gap-1">
      {SHORTCUTS.map((shortcut, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={
            isInView
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 8, filter: "blur(4px)" }
          }
          transition={{
            duration: 0.7,
            delay: i * 0.08,
            ease: [0.22, 1, 0.36, 1], // Smooth ease out
          }}
        >
          <ShortcutRow
            icon={shortcut.icon}
            action={shortcut.action}
            keys={shortcut.keys}
          />
        </motion.div>
      ))}
    </div>
  );
};

// Individual Shortcut Row
const ShortcutRow = memo(function ShortcutRow({
  icon,
  action,
  keys,
}: {
  icon: React.ReactNode;
  action: string;
  keys: string[];
}) {
  return (
    <motion.div
      variants={shortcutRowVariants}
      initial="rest"
      whileHover="hover"
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer"
    >
      {/* Icon */}
      <motion.div
        variants={shortcutIconVariants}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0"
      >
        {icon}
      </motion.div>

      {/* Action Text */}
      <motion.span
        variants={shortcutTextVariants}
        transition={{ duration: 0.2 }}
        className="flex-1 text-[13.5px] font-normal tracking-tight"
      >
        {action}
      </motion.span>

      {/* Keyboard Keys */}
      <div className="flex items-center gap-1.5">
        {keys.map((key, i) => (
          <CleanKey key={i} keyLabel={key} />
        ))}
      </div>
    </motion.div>
  );
});

// Clean Key Component
const CleanKey = memo(function CleanKey({ keyLabel }: { keyLabel: string }) {
  return (
    <motion.div
      variants={cleanKeyVariants}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="min-w-[26px] h-[26px] px-2 flex items-center justify-center rounded-md border bg-white"
    >
      <motion.span
        variants={cleanKeyTextVariants}
        transition={{ duration: 0.15 }}
        className="text-[11.5px] font-medium select-none"
      >
        {keyLabel}
      </motion.span>
    </motion.div>
  );
});

// Context Aware AI Replies Skeleton
const ContextAwareRepliesSkeleton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedReply, setSelectedReply] = useState<number | null>(null);

  useEffect(() => {
    if (selectedReply) {
      const timer = setTimeout(() => setSelectedReply(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedReply]);

  // Stable onClick handlers so memoised MinimalAIReply never re-renders due to onClick
  const onReply1 = useCallback(() => setSelectedReply(1), []);
  const onReply2 = useCallback(() => setSelectedReply(2), []);
  const onReply3 = useCallback(() => setSelectedReply(3), []);
  const replyHandlers = [onReply1, onReply2, onReply3] as const;

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bottom fade so replies tuck nicely */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-gray-100/60 to-transparent z-20 pointer-events-none" />

      {/* Success overlay */}
      <AnimatePresence>
        {selectedReply && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center z-30 bg-white/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <p className="text-xs font-medium text-neutral-600">Reply sent</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email card — centered at rest, flies above the fold on hover */}
      <motion.div
        className="absolute left-0 right-0 px-5"
        animate={{
          top: isHovered ? "-120%" : "50%",
          y: isHovered ? 0 : "-50%",
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlassmorphicEmailCard />
      </motion.div>

      {/* Reply chips — slide up from below on hover */}
      <motion.div
        className="absolute left-0 right-0 px-5 flex flex-col gap-2"
        animate={{ top: isHovered ? "8%" : "110%" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Label */}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px flex-1 bg-neutral-100" />
          <span className="text-[9px] text-neutral-400 font-medium uppercase tracking-widest flex items-center gap-1">
            <SparklesIcon className="w-2.5 h-2.5" />
            Suggested replies
          </span>
          <div className="h-px flex-1 bg-neutral-100" />
        </div>

        {REPLIES.map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
            transition={{
              duration: 0.3,
              delay: isHovered ? 0.1 + i * 0.07 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <MinimalAIReply text={text} onClick={replyHandlers[i]} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

const GlassmorphicEmailCard = memo(function GlassmorphicEmailCard() {
  return (
    <div className="relative p-3.5 rounded-xl overflow-hidden">
      {/* Subtle gradient overlay */}

      <div className="flex gap-3 relative z-10">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-black/5">
          <Image
            src="/abhisharma.webp"
            height={36}
            width={36}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-medium text-neutral-700">
              Abhi Sharma
            </span>
            <span className="text-[10px] text-neutral-400">2m ago</span>
          </div>

          <p className="text-[11.5px] font-medium text-neutral-600">
            Quick question about tomorrow&apos;s meeting
          </p>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Hey! Can we push the 2pm meeting to 3pm? I have a conflict.
          </p>

          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-white/60 text-neutral-600 font-medium border border-black/5">
              Meeting
            </span>
            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-white/60 text-neutral-600 font-medium border border-black/5">
              Reschedule
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const MinimalAIReply = memo(function MinimalAIReply({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="relative p-3 rounded-xl cursor-pointer overflow-hidden group"
      variants={replyLiftVariants}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glassmorphic background */}
      <motion.div
        variants={replyBgVariants}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 backdrop-blur-sm border rounded-xl"
      />

      {/* Subtle gradient on hover */}
      <motion.div
        variants={replyGradientVariants}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-blue-50/20 to-transparent rounded-xl"
      />

      <div className="flex gap-2.5 relative z-10">
        {/* AI Icon */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-50 flex items-center justify-center flex-shrink-0 ring-1 ring-black/5">
          <Image
            alt=""
            src="/logo.png"
            width={14}
            height={14}
            className="w-3.5 h-3.5"
          />
        </div>

        {/* Reply Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-neutral-600 leading-relaxed">{text}</p>
        </div>

        {/* Arrow indicator */}
        <motion.div
          variants={replyArrowVariants}
          transition={{ duration: 0.15 }}
          className="text-neutral-300"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
});

const CardShell = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md" | "lg";
  }
>(({ children, className, size = "md" }, ref) => {
  const sizeClasses = {
    sm: "w-8 h-8 md:w-12 md:h-12",
    md: "w-10 h-10 md:w-14 md:h-14",
    lg: "w-12 h-12 md:w-16 md:h-16",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-xl border border-neutral-200 flex items-center justify-center shadow-sm",
        "hover:border-neutral-300 hover:shadow-md transition-all duration-200",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
});
CardShell.displayName = "CardShell";

// Email Provider Component (Left Side)
const EmailProvider = React.forwardRef<
  HTMLDivElement,
  { icon: string; label: string }
>(({ icon, label }, ref) => {
  return (
    <div className="flex z-10 items-center gap-2 md:gap-3 group cursor-pointer">
      <span className="hidden md:block text-sm text-neutral-600 font-medium group-hover:text-neutral-800 transition-colors">
        {label}
      </span>
      <CardShell ref={ref} size="md">
        <Image
          src={icon}
          width={20}
          height={20}
          alt={label}
          className="md:w-[26px] md:h-[26px]"
        />
      </CardShell>
    </div>
  );
});
EmailProvider.displayName = "EmailProvider";

// Integration Box Component (Right Side)
const IntegrationBox = React.forwardRef<
  HTMLDivElement,
  { icon: string; label: string }
>(({ icon, label }, ref) => {
  return (
    <div className="group z-20 cursor-pointer relative">
      <CardShell ref={ref} size="md">
        <Image
          src={icon}
          width={20}
          height={20}
          alt={label}
          className="md:w-[26px] md:h-[26px]"
        />
      </CardShell>

      {/* Tooltip on hover - hidden on mobile */}
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <span className="text-xs font-medium text-neutral-600 whitespace-nowrap bg-white px-2 py-1 rounded-md border border-neutral-200 shadow-sm">
          {label}
        </span>
      </div>
    </div>
  );
});
IntegrationBox.displayName = "IntegrationBox";

// Central Hub Component
const CentralHub = React.forwardRef<HTMLDivElement, object>((_, ref) => {
  return (
    <div ref={ref} className="relative z-10">
      <div className="bg-white rounded-2xl border border-neutral-200 px-2 py-3 md:py-4 shadow-md min-w-[70px] md:min-w-25">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Image
            src="/logo.png"
            width={24}
            height={24}
            alt="Bettermail"
            className="md:w-8 md:h-8"
          />
        </div>
      </div>
    </div>
  );
});
CentralHub.displayName = "CentralHub";

const AIWorkflowSkeleton = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const gmail = useRef<HTMLDivElement>(null);
  const outlook = useRef<HTMLDivElement>(null);
  const yahoo = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const notion = useRef<HTMLDivElement>(null);
  const gmeet = useRef<HTMLDivElement>(null);
  const slack = useRef<HTMLDivElement>(null);
  const telegram = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative flex items-center justify-between px-4 md:px-12 lg:px-24 py-8 md:py-12"
    >
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-6 md:gap-12 justify-center">
        <EmailProvider ref={gmail} icon="/gmailIcon.svg" label="Gmail" />
        <EmailProvider ref={outlook} icon="/outlookIcon.svg" label="Outlook" />
        <EmailProvider ref={yahoo} icon="/logo.png" label="Yahoo" />
      </div>

      {/* CENTER HUB */}
      <CentralHub ref={hub} />

      {/* RIGHT SIDE - Responsive Scattered Layout */}
      <div className="relative w-[140px] h-[200px] md:w-[260px] md:h-[320px]">
        {/* Notion - Top left */}
        <div ref={notion} className="absolute top-0 left-2 md:left-4">
          <IntegrationBox icon="/notionIcon.svg" label="Notion" />
        </div>

        {/* Google Meet - Top right */}
        <div
          ref={gmeet}
          className="absolute top-6 right-4 md:top-10 md:right-10"
        >
          <IntegrationBox icon="/meetIcon.svg" label="Google Meet" />
        </div>

        {/* Slack - Bottom right area */}
        <div
          ref={slack}
          className="absolute bottom-12 right-6 md:bottom-20 md:right-12"
        >
          <IntegrationBox icon="/slackIcon.svg" label="Slack" />
        </div>

        {/* Telegram - Bottom right */}
        <div ref={telegram} className="absolute bottom-0 right-0">
          <IntegrationBox icon="/telegramIcon.svg" label="Telegram" />
        </div>
      </div>

      {/* ANIMATED BEAMS — only rendered when section enters the viewport */}
      {isInView && (
        <>
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={gmail}
            toRef={hub}
            curvature={0}
            endYOffset={-30}
            duration={3}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#EA4335"
            gradientStopColor="#6366f1"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={outlook}
            toRef={hub}
            curvature={0}
            endYOffset={0}
            duration={3}
            delay={0.3}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#0078D4"
            gradientStopColor="#6366f1"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={yahoo}
            toRef={hub}
            curvature={0}
            endYOffset={30}
            duration={3}
            delay={0.6}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#6001D2"
            gradientStopColor="#6366f1"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={hub}
            toRef={notion}
            curvature={0}
            startYOffset={0}
            endXOffset={0}
            duration={3}
            delay={0.9}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#6366f1"
            gradientStopColor="#000000"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={hub}
            toRef={gmeet}
            curvature={0}
            startYOffset={0}
            endXOffset={0}
            duration={3}
            delay={1.2}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#6366f1"
            gradientStopColor="#0F9D58"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={hub}
            toRef={slack}
            curvature={0}
            startYOffset={0}
            endXOffset={10}
            duration={3}
            delay={1.5}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#6366f1"
            gradientStopColor="#4A154B"
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={hub}
            toRef={telegram}
            curvature={0}
            startYOffset={0}
            endXOffset={0}
            duration={3}
            delay={1.8}
            pathColor="#e5e7eb"
            pathWidth={1.5}
            pathOpacity={0.8}
            gradientStartColor="#6366f1"
            gradientStopColor="#26A5E4"
          />
        </>
      )}
    </div>
  );
};

// Variable chip — animates between {{placeholder}} and filled value
const VarChip = memo(function VarChip({
  placeholder,
  value,
  filled,
  delay = 0,
}: {
  placeholder: string;
  value: string;
  filled: boolean;
  delay?: number;
}) {
  return (
    <AnimatePresence mode="wait">
      {filled ? (
        <motion.span
          key={`filled-${value}`}
          initial={{ opacity: 0, y: -5, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.88 }}
          transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[11px] font-medium"
        >
          {value}
        </motion.span>
      ) : (
        <motion.span
          key="placeholder"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-500 text-[11px] font-mono border border-amber-200/70"
        >
          {`{{${placeholder}}}`}
        </motion.span>
      )}
    </AnimatePresence>
  );
});

const TemplatesSkeleton = () => {
  const [filled, setFilled] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;

    const initTimer = setTimeout(() => setFilled(true), 900);
    let fillTimer: ReturnType<typeof setTimeout>;

    const cycleTimer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % TEMPLATE_EXAMPLES.length);
      setFilled(false);
      fillTimer = setTimeout(() => setFilled(true), 500);
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(cycleTimer);
      clearTimeout(fillTimer);
    };
  }, [isInView]);

  const current = TEMPLATE_EXAMPLES[currentIdx];

  return (
    <div ref={containerRef} className="h-full w-full p-5 flex flex-col gap-3">
      {/* Template header row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
          Job Application
        </span>
      </div>

      {/* Template body card */}
      <div className="flex-1 bg-white/80 rounded-xl border border-neutral-100 p-4 space-y-2">
        {/* Subject line */}
        <p className="text-[10.5px] text-neutral-400 font-medium uppercase tracking-wide">
          Subject
        </p>
        <p className="text-[11.5px] text-neutral-600 font-medium mb-3">
          Application for full stack developer
        </p>

        <div className="w-full h-px bg-neutral-100" />

        {/* Body */}
        <p className="text-[12px] text-neutral-700 leading-[1.9] pt-1">
          Hi{" "}
          <VarChip
            placeholder="first_name"
            value={current.first_name}
            filled={filled}
            delay={0}
          />{" "}
          <VarChip
            placeholder="last_name"
            value={current.last_name}
            filled={filled}
            delay={0.09}
          />
          ,
        </p>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          I am applying for the full stack developer role and believe my
          experience is a strong fit.
        </p>
        <p className="text-[11.5px] text-neutral-600 leading-[1.9]">
          As someone once said: &ldquo;
          <VarChip
            placeholder="Motivation_quote"
            value={current.motivation_quote}
            filled={filled}
            delay={0.18}
          />
          &rdquo;
        </p>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1.5">
        {["#fullstack", "#outreach"].map((tag) => (
          <span
            key={tag}
            className="text-[9.5px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

// AI Compose Skeleton
const DRAFT_VERSIONS = [
  "hey can we move the meeting its not working for me tmrw let me know",
  "Hi! Could we reschedule tomorrow's meeting? It doesn't work for me — please let me know what works for you.",
  "I wanted to check in about tomorrow's meeting. Would it be possible to find a new time that works for both of us?",
];

const ACTION_CHIPS = [
  { label: "Fix grammar", targets: 1 },
  { label: "More formal", targets: 2 },
  { label: "Shorten", targets: 1 },
];

const TONES = ["Friendly", "Formal", "Concise", "Professional", "Empathetic"];

const AIComposeSkeleton = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  // phase: 0=idle, 1=chip selected, 2=rewritten, 3=tone open, 4=tone selected
  const [phase, setPhase] = useState(0);
  const [activeChip, setActiveChip] = useState(0);
  const [draftIdx, setDraftIdx] = useState(0);
  const [activeTone, setActiveTone] = useState<string | null>(null);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    // Phase 1: highlight a chip
    const t1 = setTimeout(() => {
      setActiveChip(0);
      setPhase(1);
    }, 800);
    // Phase 2: text rewrites
    const t2 = setTimeout(() => {
      setDraftIdx(1);
      setPhase(2);
    }, 1600);
    // Phase 3: open tone menu
    const t3 = setTimeout(() => {
      setShowToneMenu(true);
      setPhase(3);
    }, 3200);
    // Phase 4: select a tone + close menu
    const t4 = setTimeout(() => {
      setActiveTone("Professional");
      setShowToneMenu(false);
      setPhase(4);
    }, 4200);
    // Reset state and loop
    const t5 = setTimeout(() => {
      setPhase(0);
      setActiveChip(0);
      setDraftIdx(0);
      setActiveTone(null);
      setShowToneMenu(false);
      setLoopKey((k) => k + 1);
    }, 6200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isInView, loopKey]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full p-4 flex flex-col gap-3 relative"
    >
      {/* Mini composer chrome */}
      <div className="flex-1 bg-white rounded-xl border border-neutral-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="ml-1 text-[10px] text-neutral-400 font-medium">
            New Message
          </span>
        </div>

        {/* Draft body */}
        <div className="flex-1 px-3 py-2.5 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={draftIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-[11px] leading-relaxed text-neutral-600"
            >
              {DRAFT_VERSIONS[draftIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* AI refine bar */}
        <div className="relative border-t border-neutral-100">
          {/* Tone dropdown */}
          <AnimatePresence>
            {showToneMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-full right-2 mb-1 bg-white border border-neutral-100 rounded-xl shadow-lg py-1.5 z-30 min-w-[110px]"
              >
                {TONES.map((tone, i) => (
                  <motion.div
                    key={tone}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.18 }}
                    className={`px-3 py-1.5 text-[11px] cursor-pointer transition-colors ${
                      tone === "Professional"
                        ? "text-neutral-800 font-medium bg-neutral-50"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    {tone}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1.5 px-2.5 py-2">
            <SparklesIcon className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="flex-1 text-[10.5px] text-neutral-400 italic">
              Rewrite draft&hellip;
            </span>
            {/* Tone button */}
            <motion.div
              animate={{
                backgroundColor:
                  showToneMenu || activeTone ? "#f5f3ff" : "#f5f5f5",
                color: showToneMenu || activeTone ? "#7c3aed" : "#737373",
              }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer"
            >
              {activeTone ?? "Tone"}
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            {/* Send */}
            <div className="w-5 h-5 rounded-md bg-neutral-900 flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 12V4M4 8l4-4 4 4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ACTION_CHIPS.map((chip, i) => (
          <motion.div
            key={chip.label}
            animate={{
              backgroundColor:
                activeChip === i && phase >= 1
                  ? "#171717"
                  : "rgba(255,255,255,0.8)",
              color: activeChip === i && phase >= 1 ? "#ffffff" : "#525252",
              borderColor:
                activeChip === i && phase >= 1 ? "#171717" : "#e5e5e5",
              scale: activeChip === i && phase === 1 ? 1.05 : 1,
            }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="px-2.5 py-1 rounded-full border text-[10.5px] font-medium cursor-pointer"
          >
            {chip.label}
          </motion.div>
        ))}
        <motion.div
          animate={{
            backgroundColor: "rgba(255,255,255,0.8)",
            color: "#525252",
            borderColor: "#e5e5e5",
          }}
          className="px-2.5 py-1 rounded-full border text-[10.5px] font-medium cursor-pointer"
        >
          Add bullets
        </motion.div>
      </div>
    </div>
  );
};

// ============= ZERO INBOX SKELETON =============

const INBOX_EMAILS = [
  {
    sender: "Sarah Chen",
    subject: "Q4 design review — can we align?",
    dot: "bg-rose-400",
  },
  {
    sender: "Notion",
    subject: "Your weekly digest is ready",
    dot: "bg-neutral-300",
  },
  {
    sender: "Alex Kim",
    subject: "Re: launch timeline confirmed!",
    dot: "bg-amber-400",
  },
  {
    sender: "GitHub",
    subject: "[betterMail] PR #42 merged",
    dot: "bg-neutral-300",
  },
  {
    sender: "Zara Ahmed",
    subject: "Quick question about the demo",
    dot: "bg-sky-400",
  },
];

const EmailRow = memo(function EmailRow({
  email,
  idx,
}: {
  email: (typeof INBOX_EMAILS)[0];
  idx: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 72, scale: 0.96 }}
      transition={{ duration: 0.3, delay: idx * 0.06, ease: "easeOut" }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl group cursor-default"
    >
      <div className={`w-2 h-2 rounded-full ${email.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-neutral-800 truncate">
          {email.sender}
        </p>
        <p className="text-[11px] text-neutral-400 truncate">{email.subject}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] text-neutral-500 font-medium">
          Done
        </span>
      </div>
    </motion.div>
  );
});



// ============= ANALYTICS SKELETON =============

const ANALYTICS_BARS = [
  { h: 38, highlight: false },
  { h: 62, highlight: false },
  { h: 48, highlight: false },
  { h: 88, highlight: true },
  { h: 55, highlight: false },
  { h: 32, highlight: false },
  { h: 70, highlight: false },
];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function ScoreArc({ score }: { score: number }) {
  const r = 28;
  const cx = 36;
  const cy = 36;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  return (
    <div className="relative shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#f5f5f5"
          strokeWidth={6}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth={6}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.04s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-bold text-neutral-800 leading-none">
          {score}
        </span>
        <span className="text-[8px] text-emerald-500 font-semibold mt-0.5">
          GREAT
        </span>
      </div>
    </div>
  );
}

const StatPill = memo(function StatPill({
  label,
  value,
  delay,
  isInView,
}: {
  label: string;
  value: string;
  delay: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="flex items-center gap-2"
    >
      <span className="text-[10px] text-neutral-400 leading-none">{label}</span>
      <span className="text-[10px] font-semibold text-neutral-700 leading-none">
        {value}
      </span>
    </motion.div>
  );
});



// ============= BASE COMPONENTS =============

const Card = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return <div className={cn("bg-white p-4 md:p-6", className)}>{children}</div>;
};

const CardTitle = ({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h2
      className={cn(
        "text-base md:text-lg font-medium tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  );
};

const CardDescription = ({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={cn("text-sm text-neutral-400 mt-2", className)}>{children}</p>
  );
};

const CardHeader = ({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>{children}</div>
  );
};

const CardSkeleton = ({
  className,
  children,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "my-4 h-60 w-full overflow-hidden rounded-lg bg-gray-100/40",
        // "bg-[radial-gradient(#aaa_1px,transparent_1px)]",
        "bg-[length:10px_10px]",
        // "[mask-image:radial-gradient(circle_at_center,white,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
};
