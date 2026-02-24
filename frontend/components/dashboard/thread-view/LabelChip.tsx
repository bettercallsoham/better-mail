"use client";

import { IconTag } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { EmailLabel } from "@/features/mailbox/mailbox.type";

interface LabelChipProps {
  label: EmailLabel;
  variant?: "dot" | "badge";
}

function labelColor(label: EmailLabel): string {
  if (label.color) return label.color;
  // Derive a stable hue from the name — guard against undefined/empty
  const name = label.name ?? "";
  const hue  = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 62% 50%)`;
}

export function LabelChip({ label, variant = "dot" }: LabelChipProps) {
  if (!label?.name) return null;

  const color = labelColor(label);

  if (variant === "badge") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium leading-none"
        style={{
          background: `${color}18`,
          color,
          border: `1px solid ${color}28`,
        }}
      >
        <IconTag size={9} strokeWidth={2.5} />
        {label.name}
      </span>
    );
  }

  // dot — tiny coloured circle with hover tooltip
  return (
    <span className="group/lc relative flex-shrink-0">
      <span
        className="block w-[7px] h-[7px] rounded-full"
        style={{ background: color }}
      />
      <span
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50",
          "whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium shadow-lg",
          "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
          "opacity-0 group-hover/lc:opacity-100 transition-opacity duration-150",
        )}
      >
        {label.name}
      </span>
    </span>
  );
}