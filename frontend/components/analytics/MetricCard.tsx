"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  /** @deprecated use iconClass */
  iconColor?: string;
  iconClass?: string;
  /** Tailwind bg-* class for the left accent stripe */
  accentClass?: string;
  className?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconClass,
  accentClass,
  className,
  onClick,
  badge,
}: MetricCardProps) {
  const Tag = onClick ? "button" : "div";
  const resolvedIconClass = iconClass ?? iconColor ?? "text-neutral-400";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900/60 px-5 py-4 text-left overflow-hidden",
        "transition-all duration-150",
        onClick
          ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 active:scale-[0.99]"
          : "",
        className,
      )}
    >
      {/* Left accent stripe */}
      {accentClass && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0.75 rounded-l-2xl",
            accentClass,
          )}
        />
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-500 truncate">
          {title}
        </p>
        <span className={cn("opacity-50 shrink-0", resolvedIconClass)}>
          <Icon size={13} />
        </span>
      </div>

      {/* Value */}
      <p className="text-[28px] font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
        {value}
      </p>

      {/* Footer */}
      {(description || badge) && (
        <div className="flex items-center justify-between gap-2 mt-auto pt-0.5">
          {description && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate leading-snug">
              {description}
            </p>
          )}
          {badge}
        </div>
      )}
    </Tag>
  );
}
