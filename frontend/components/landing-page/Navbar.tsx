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
          ? "py-3 backdrop-blur-xl border-b shadow-sm bg-white/70 dark:bg-black/70 border-black/5 dark:border-white/10"
          : "py-5 bg-transparent border-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl">
              <Image
                src="/logo.png"
                fill
                alt="bettermail-logo"
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Always theme-driven */}
            <span className="text-lg font-bold tracking-tight transition-colors duration-300 text-black dark:text-white">
              BetterMail
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "About", "Pricing"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium transition-all duration-300 hover:opacity-60 text-neutral-700 dark:text-neutral-300"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <AnimatedThemeToggler />
            <Link
              href="/auth"
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 bg-black text-white dark:bg-white dark:text-black shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
