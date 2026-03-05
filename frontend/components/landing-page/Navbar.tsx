"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "AI Chat", href: "#ai" },
  { label: "FAQ", href: "#faq" },
];

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
          ? "py-3 backdrop-blur-xl border-b shadow-sm bg-white/80 border-black/8"
          : "py-5 bg-transparent border-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-xl shrink-0">
              <Image
                src="/betterMailLogo.png"
                fill
                alt="BetterMail"
                className="object-contain h-6 w-6 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className=" text-2xl  text-neutral-950">
              BetterMail
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-sans text-[14px] font-medium text-neutral-600 hover:text-neutral-950 transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="font-sans px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 active:scale-95 bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
