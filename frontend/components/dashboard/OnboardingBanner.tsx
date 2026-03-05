"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  useConnectedAccounts,
  useConnectAccount,
} from "@/features/mailbox/mailbox.query";
import { cn } from "@/lib/utils";

// ── Individual provider button ────────────────────────────────────────────────

function ProviderButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-3 w-full px-4 h-11 rounded-xl",
        "bg-white dark:bg-neutral-800/60",
        "border border-black/8 dark:border-white/10",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        "text-[13px] font-medium text-neutral-700 dark:text-neutral-200",
        "cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      )}
    >
      <Image
        src={icon}
        alt={label}
        width={18}
        height={18}
        className="shrink-0"
      />
      <span className="flex-1 text-left">{label}</span>
      <svg
        className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -mr-0.5"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path
          d="M3 7h8M7.5 3.5L11 7l-3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}

// ── Inner — reads from suspense query ─────────────────────────────────────────

function OnboardingBannerInner() {
  const { data } = useConnectedAccounts();
  const { mutate: connect, isPending } = useConnectAccount();

  const accounts = data?.data ?? [];
  if (accounts.length > 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 z-30 flex items-center justify-center p-6"
      >
        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-white/40 dark:bg-[#1c1a18]/60 backdrop-blur-sm" />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className={cn(
            "relative z-10 w-full max-w-85 rounded-2xl p-6",
            "bg-white/80 dark:bg-neutral-900/70",
            "backdrop-blur-2xl",
            "border border-black/6 dark:border-white/8",
            "shadow-xl shadow-black/6 dark:shadow-black/30",
          )}
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-4 mx-auto">
            <svg
              className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M2.5 5.5C2.5 4.395 3.395 3.5 4.5 3.5h11c1.105 0 2 .895 2 2v9c0 1.105-.895 2-2 2h-11c-1.105 0-2-.895-2-2v-9Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M2.5 6.5l7.5 5 7.5-5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="text-center mb-5">
            <h2 className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
              Connect your email
            </h2>
            <p className="mt-1 text-[12px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
              Link your inbox to get started — it only takes a second.
            </p>
          </div>

          {/* Provider buttons */}
          <div className="flex flex-col gap-2.5">
            <ProviderButton
              icon="/google-logo.svg"
              label="Continue with Google"
              disabled={isPending}
              onClick={() => connect("gmail")}
            />
            <ProviderButton
              icon="/outlook-logo.svg"
              label="Continue with Outlook"
              disabled={isPending}
              onClick={() => connect("outlook")}
            />
          </div>

          {/* Footnote */}
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] font-semibold text-neutral-300 dark:text-neutral-600">
            Secure OAuth — no passwords stored
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Export — caller wraps in Suspense ─────────────────────────────────────────

export function OnboardingBanner() {
  return <OnboardingBannerInner />;
}
