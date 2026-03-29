"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "AI Chat", href: "/#ai" },
  { label: "FAQ", href: "/#faq" },
];

function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/nerdyabhi/better-mail")
      .then((res) => res.json())
      .then((data) => setStars(data.stargazers_count ?? null))
      .catch(() => setStars(null));
  }, []);

  const formatted =
    stars === null
      ? null
      : stars >= 1000
      ? `${(stars / 1000).toFixed(1)}k`
      : stars.toString();

  return (
    <Link
      href="https://github.com/nerdyabhi/better-mail"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium",
        "text-neutral-600 border-neutral-200 bg-white/60 hover:border-neutral-300 hover:text-neutral-900",
        "transition-all duration-200 active:scale-95 shadow-sm backdrop-blur-sm"
      )}
    >
      {/* GitHub icon */}
      <svg
        viewBox="0 0 16 16"
        className="w-3.5 h-3.5 fill-neutral-600"
        aria-hidden="true"
      >
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>

      {/* Star icon + count */}
      <span className="flex items-center gap-1 text-neutral-500">
        <svg
          viewBox="0 0 16 16"
          className="w-3 h-3 fill-amber-400"
          aria-hidden="true"
        >
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
        </svg>
        {formatted ?? "Star"}
      </span>
    </Link>
  );
}

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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-7 w-7 overflow-hidden rounded-lg shrink-0">
              <Image
                src="/betterMailLogo.png"
                fill
                alt="BetterMail"
                className="object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="hidden md:block text-[15px] font-semibold tracking-tight text-neutral-900">
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
          <div className="flex items-center gap-2">
            <GitHubStars />
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