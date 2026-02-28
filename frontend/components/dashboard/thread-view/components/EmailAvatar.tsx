"use client";

import { cn } from "@/lib/utils";

interface EmailAvatarProps {
  name?: string;
  email: string;
  size?: 6 | 7 | 8 | 9 | 10;
  className?: string;
}

const SIZE_CLS: Record<number, string> = {
  6:  "w-6  h-6  text-[9px]",
  7:  "w-7  h-7  text-[10px]",
  8:  "w-8  h-8  text-[11px]",
  9:  "w-9  h-9  text-[12px]",
  10: "w-10 h-10 text-[13px]",
};

function hue(email: string): number {
  return email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
}

function initials(name?: string, email?: string): string {
  const src   = name?.trim() || email?.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
}

export function EmailAvatar({ name, email, size = 8, className }: EmailAvatarProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center",
        "font-semibold text-white select-none tracking-[0.02em]",
        SIZE_CLS[size] ?? SIZE_CLS[8],
        className,
      )}
      style={{ background: `hsl(${hue(email)} 25% 50%)` }}
    >
      {initials(name, email)}
    </span>
  );
}