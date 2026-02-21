"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { analytics } from "@/lib/analytics/events";
import Navbar from "@/components/landing-page/Navbar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AuthPage() {
  const handleGoogleLogin = () => {
    analytics.gmailLogin();
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleOutlookLogin = () => {
    analytics.outlookLogin();
    window.location.href = `${API_URL}/auth/outlook`;
  };

  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen items-center justify-center p-6 overflow-hidden">
        <Image
          src="/bg-image.png"
          alt="Auth background"
          fill
          priority
          className="object-cover object-center pointer-events-none scale-105"
        />

        {/* Dynamic Frosted Overlays */}
        <div className="absolute inset-0 dark:bg-black/40 bg-white/10 backdrop-blur-sm" />

        {/* Compact Premium Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-[24px] border border-white/40 bg-white/90 p-10 shadow-2xl backdrop-blur-sm dark:border-neutral-800/50 dark:bg-black/90"
        >
          {/* Subtle Grid with Radial Alpha Mask */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]"
            style={{
              backgroundSize: "12px 12px",
              maskImage:
                "radial-gradient(circle at center, black, transparent 90%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, black, transparent 90%)",
            }}
          />

          <div className="text-center space-y-2">
            <h1 className="font-instrument text-4xl tracking-tight text-neutral-900 dark:text-neutral-100 ">
              Welcome to BetterMail
            </h1>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 font-medium">
              The fastest Email Experience ever made.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <OAuthButton
              onClick={handleGoogleLogin}
              icon="/google-logo.svg"
              label="Continue with Google"
            />
            <OAuthButton
              onClick={handleOutlookLogin}
              icon="/outlook-logo.svg"
              label="Continue with Outlook"
            />
          </div>

          <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-400 dark:text-neutral-600">
            Secure Enterprise Login
          </p>
        </motion.div>
      </main>
    </>
  );
}

function OAuthButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group/btn cursor-pointer relative flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 text-[14px] font-semibold text-neutral-800 shadow-sm transition-all hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800"
    >
      <Image
        src={icon}
        alt={label}
        width={18}
        height={18}
        className="shrink-0 transition-transform group-hover/btn:scale-110"
      />
      <span>{label}</span>

      {/* Animated Bottom Gradient - "The Aceternity Signature" */}
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-0.5 w-1/2 bg-linear-to-r from-transparent via-sky-400 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </motion.button>
  );
}
