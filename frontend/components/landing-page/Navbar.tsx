"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
        scrolled
          ? "py-3 backdrop-blur-xl border-b shadow-sm bg-white/80 dark:bg-neutral-950/80 border-black/8 dark:border-white/10"
          : "py-5 bg-transparent border-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shrink-0">
              <Image
                src="/logo.png"
                fill
                alt="BetterMail"
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="font-sans text-[17px] font-medium tracking-tight text-neutral-950 dark:text-white">
              BETTERMAIL
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "About", "Pricing"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="font-sans text-[14px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors duration-200"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <AnimatedThemeToggler className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200" />
            <Link
              href="/auth"
              className="font-sans px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-95 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm"
            >
              Get Started
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}