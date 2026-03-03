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
  /** text-* class applied to the icon */
  iconClass?: string;
  /** Used as top-accent strip bg class, e.g. "bg-blue-500/10" */
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

  // Derive a solid accent color class for the top strip from accentClass
  // e.g. "bg-blue-500/10" → strip uses the icon's text color as a 3px top border via box-shadow
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900/60 px-5 pt-4 pb-5 text-left overflow-hidden",
        "transition-all duration-150",
        onClick
          ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm active:scale-[0.99]"
          : "",
        className,
      )}
    >
   

      {/* Label row */}
      <div className="flex items-start justify-between gap-2 mt-1">
        <p className="text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500 uppercase leading-none pt-0.5">
          {title}
        </p>
     
      </div>

      {/* Value — the hero */}
      <p className="mt-3 text-[38px] font-normal tracking-tight font-instrument tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
        {value}
      </p>

      {/* Footer */}
      {(description || badge) && (
        <div className="flex items-center justify-between gap-2 mt-3">
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
