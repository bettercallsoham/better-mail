"use client";

import cn from "clsx";
import {
  BrainIcon,
  KeyboardIcon,
  SparklesIcon,
  ZapIcon,
  MailIcon,
  CheckCircleIcon,
  Check,
  Mail,
  Archive,
  Reply,
  Search,
  Star,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import Image from "next/image";
import { AnimatedBeam } from "../ui/animated-beam";

export default function Bento() {
  return (
    <div className="flex flex-col gap-10 items-center justify-center bg-neutral-50 py-10 sm:py-20">
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

            {/* Automatic Actions Card */}
            <Card className="border-t md:border-t-0">
              <CardHeader>
                <ZapIcon className="w-5 h-5" />
                <CardTitle>Automatic Actions</CardTitle>
              </CardHeader>
              <CardDescription>
                Set up rules and let AI handle repetitive tasks. Auto-archive
                newsletters, label emails, or forward to team members.
              </CardDescription>
              <CardSkeleton>
                <AutoActionsSkeleton />
              </CardSkeleton>
            </Card>

            {/* Natural Language Search Card */}
            <Card className="border-t md:border-t-0">
              <CardHeader>
                <SparklesIcon className="w-5 h-5" />
                <CardTitle>Natural Language Search</CardTitle>
              </CardHeader>
              <CardDescription>
                Search your inbox like you talk. &quot;Emails from Sarah about
                the project last week&quot; - AI understands context.
              </CardDescription>
              <CardSkeleton>
                <NaturalSearchSkeleton />
              </CardSkeleton>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= SKELETON COMPONENTS =============

// Premium Keyboard Shortcuts Skeleton - Truly Minimal
const KeyboardShortcutsSkeleton = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const shortcuts = [
    {
      icon: <Mail size={15} />,
      action: "Compose new email",
      keys: ["⌘", "N"],
    },
    {
      icon: <Archive size={15} />,
      action: "Archive selected",
      keys: ["E"],
    },
    {
      icon: <Star size={15} />,
      action: "Mark as important",
      keys: ["⌘", "I"],
    },
    {
      icon: <Search size={15} />,
      action: "Search emails",
      keys: ["⌘", "F"],
    },
    {
      icon: <Reply size={15} />,
      action: "Reply",
      keys: ["R"],
    },
  ];

  return (
    <div ref={containerRef} className="h-full w-full p-6 flex flex-col gap-1">
      {shortcuts.map((shortcut, i) => (
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
const ShortcutRow = ({
  icon,
  action,
  keys,
}: {
  icon: React.ReactNode;
  action: string;
  keys: string[];
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer"
      animate={{
        backgroundColor: isHovered ? "rgba(0, 0, 0, 0.02)" : "rgba(0, 0, 0, 0)",
        scale: isHovered ? 1.005 : 1,
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
    >
      {/* Icon */}
      <motion.div
        className="flex-shrink-0"
        animate={{
          color: isHovered ? "#525252" : "#a3a3a3",
        }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.div>

      {/* Action Text */}
      <motion.span
        className="flex-1 text-[13.5px] font-normal tracking-tight"
        animate={{
          color: isHovered ? "#262626" : "#737373",
        }}
        transition={{ duration: 0.2 }}
      >
        {action}
      </motion.span>

      {/* Keyboard Keys */}
      <div className="flex items-center gap-1.5">
        {keys.map((key, i) => (
          <CleanKey key={i} keyLabel={key} isPressed={isHovered} />
        ))}
      </div>
    </motion.div>
  );
};

// Clean Key Component
const CleanKey = ({
  keyLabel,
  isPressed,
}: {
  keyLabel: string;
  isPressed: boolean;
}) => {
  return (
    <motion.div
      className="min-w-[26px] h-[26px] px-2 flex items-center justify-center rounded-md border bg-white"
      animate={{
        y: isPressed ? 0.5 : 0,
        borderColor: isPressed ? "#d4d4d4" : "#e5e5e5",
        boxShadow: isPressed
          ? "0 1px 2px rgba(0, 0, 0, 0.05)"
          : "0 1px 3px rgba(0, 0, 0, 0.08)",
      }}
      transition={{
        duration: 0.15,
        ease: "easeOut",
      }}
    >
      <motion.span
        className="text-[11.5px] font-medium select-none"
        animate={{
          color: isPressed ? "#525252" : "#737373",
        }}
        transition={{ duration: 0.15 }}
      >
        {keyLabel}
      </motion.span>
    </motion.div>
  );
};

// Context Aware AI Replies Skeleton - Ultra Minimal with Glassmorphism
// Context Aware AI Replies Skeleton - Email Shows First + Auto Reset
const ContextAwareRepliesSkeleton = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedReply, setSelectedReply] = useState<number | null>(null);

  // Auto reset after 1.5s
  useEffect(() => {
    if (selectedReply) {
      const timer = setTimeout(() => {
        setSelectedReply(null);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [selectedReply]);

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Fade Mask */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-white to-transparent z-20 pointer-events-none" />

      {/* Bottom Fade Mask */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-white to-transparent z-20 pointer-events-none" />

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
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="text-sm font-medium text-neutral-700">
                Reply sent successfully
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content - Email visible by default, slides up on hover */}
      <motion.div
        className="h-full px-6 flex flex-col items-center justify-center gap-4"
        animate={{
          y: isHovered ? -30 : 20, // Start at 20px down, slide up on hover
        }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Glassmorphic Email Card - Always visible */}
        <GlassmorphicEmailCard />

        {/* AI Reply Options - Fade in on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            y: isHovered ? 0 : 10,
          }}
          transition={{
            duration: 0.3,
            delay: isHovered ? 0.15 : 0,
          }}
          className="space-y-2"
        >
          <MinimalAIReply
            text="Hi! Absolutely, 3pm works perfectly for me. I'll update the calendar invite."
            onClick={() => setSelectedReply(1)}
          />
          <MinimalAIReply
            text="Hey! No problem at all, 3pm is great. I'll send you the updated invite!"
            onClick={() => setSelectedReply(2)}
          />
          <MinimalAIReply
            text="3pm works! I'll update the invite."
            onClick={() => setSelectedReply(3)}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

const GlassmorphicEmailCard = () => {
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
};

const MinimalAIReply = ({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="relative p-3 rounded-xl cursor-pointer overflow-hidden group"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glassmorphic background */}
      <motion.div
        className="absolute inset-0 backdrop-blur-sm border rounded-xl"
        animate={{
          backgroundColor: isHovered
            ? "rgba(255, 255, 255, 0.8)"
            : "rgba(255, 255, 255, 0.4)",
          borderColor: isHovered
            ? "rgba(0, 0, 0, 0.08)"
            : "rgba(0, 0, 0, 0.04)",
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Subtle gradient on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-blue-50/20 to-transparent rounded-xl"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
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
          animate={{
            opacity: isHovered ? 1 : 0,
            x: isHovered ? 0 : -4,
          }}
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
};



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
        className
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
        <div ref={gmeet} className="absolute top-6 right-4 md:top-10 md:right-10">
          <IntegrationBox icon="/meetIcon.svg" label="Google Meet" />
        </div>

        {/* Slack - Bottom right area */}
        <div ref={slack} className="absolute bottom-12 right-6 md:bottom-20 md:right-12">
          <IntegrationBox icon="/slackIcon.svg" label="Slack" />
        </div>

        {/* Telegram - Bottom right */}
        <div ref={telegram} className="absolute bottom-0 right-0">
          <IntegrationBox icon="/telegramIcon.svg" label="Telegram" />
        </div>
      </div>

      {/* ANIMATED BEAMS - Left to Center */}
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

      {/* ANIMATED BEAMS - Center to Right */}
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
    </div>
  );
};



const AutoActionsSkeleton = () => {
  const actions = [
    { icon: <MailIcon className="w-4 h-4" />, width: "70%", active: true },
    {
      icon: <CheckCircleIcon className="w-4 h-4" />,
      width: "65%",
      active: true,
    },
    { icon: <SparklesIcon className="w-4 h-4" />, width: "60%", active: false },
    { icon: <ZapIcon className="w-4 h-4" />, width: "75%", active: true },
  ];

  return (
    <div className="h-full w-full p-6 flex flex-col gap-3">
      {actions.map((action, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm border border-neutral-200 rounded-lg hover:bg-white/80 hover:border-green-200 transition-all group"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
            {action.icon}
          </div>
          <div
            className="h-4 bg-gradient-to-r from-neutral-300 to-transparent rounded flex-1"
            style={{ width: action.width }}
          />
          {action.active && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
};

// Natural Language Search Skeleton
const NaturalSearchSkeleton = () => {
  const queries = [
    { width: "85%", highlight: "65%" },
    { width: "75%", highlight: "45%" },
    { width: "90%", highlight: "55%" },
  ];

  return (
    <div className="h-full w-full p-6 flex flex-col gap-4">
      {queries.map((query, i) => (
        <div
          key={i}
          className="relative p-4 bg-white/60 backdrop-blur-sm border border-neutral-200 rounded-lg hover:bg-white/80 hover:border-amber-200 transition-all group overflow-hidden"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <div className="relative">
            <div
              className="h-4 bg-gradient-to-r from-neutral-300 via-amber-200 to-transparent rounded"
              style={{ width: query.width }}
            />
            <div
              className="absolute top-0 left-0 h-4 bg-amber-300/40 rounded"
              style={{ width: query.highlight }}
            />
          </div>
          <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <SparklesIcon className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      ))}
    </div>
  );
};

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
        className
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
        className
      )}
    >
      {children}
    </div>
  );
};
