"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { flushSync } from "react-dom";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
  showLabel?: boolean;
  /** Render as a DropdownMenuItem with matching icon + label style */
  asMenuItem?: boolean;
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  showLabel = false,
  asMenuItem = false,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    await document.startViewTransition(() => {
      flushSync(() => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", newTheme ? "dark" : "light");
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top),
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }, [isDark, duration]);

  // ── Render as a DropdownMenuItem ───────────────────────────────────────
  // Uses DropdownMenuItem's own styling, just like Settings / Keyboard rows.
  // We pass onClick down and use asChild pattern via onSelect to prevent
  // the dropdown from closing (theme toggle should keep menu open).
  if (asMenuItem) {
    return (
      <DropdownMenuItem
        onSelect={(e) => {
          // Prevent dropdown from auto-closing on select
          e.preventDefault();
          toggleTheme();
        }}
        className="gap-2.5 py-2 cursor-pointer"
      >
        {/* Invisible ref button for getBoundingClientRect */}
        <button ref={buttonRef} className="sr-only" aria-hidden tabIndex={-1} />
        <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 flex items-center">
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </span>
        <span className="text-[12px]">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      </DropdownMenuItem>
    );
  }

  // ── Standalone button ──────────────────────────────────────────────────
  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        showLabel && "flex cursor-pointer items-center gap-2 w-full",
        className,
      )}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && (
        <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>
      )}
      {!showLabel && <span className="sr-only">Toggle theme</span>}
    </button>
  );
};
