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
  /** bg-* class for the icon bubble (e.g. "bg-blue-500/10") */
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
  const resolvedIconClass = iconClass ?? iconColor ?? "text-neutral-500";

  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900/60 px-5 py-5 text-left overflow-hidden gap-4",
        "transition-all duration-150",
        onClick
          ? "cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm active:scale-[0.99]"
          : "",
        className,
      )}
    >
      {/* Icon bubble + title */}
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
            accentClass ?? "bg-neutral-100 dark:bg-neutral-800",
          )}
        >
          <Icon size={16} className={resolvedIconClass} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-500 leading-none">
          {title}
        </p>
      </div>

      {/* Value */}
      <p className="text-[32px] font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50 leading-none">
        {value}
      </p>

      {/* Footer */}
      {(description || badge) && (
        <div className="flex items-center justify-between gap-2 mt-auto">
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
