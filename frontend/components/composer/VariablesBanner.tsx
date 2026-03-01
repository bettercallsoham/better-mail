"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import type { TemplateVariable } from "@/features/templates/templates.types";
import { cn } from "@/lib/utils";

interface Props {
  variables: TemplateVariable[];
  onApply: (values: Record<string, string>) => void;
  onDismiss: () => void;
}

export function VariablesBanner({ variables, onApply, onDismiss }: Props) {
  // initialise values from variable defaults
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((v) => [v.name, v.default ?? ""])),
  );

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, []);

  // Escape key → dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [onDismiss]);

  const handleApply = useCallback(() => {
    onApply(vals);
  }, [vals, onApply]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-2 px-3 py-1.5 overflow-x-auto",
        "border-b border-black/[0.06] dark:border-white/[0.06]",
        "bg-amber-50/60 dark:bg-amber-500/[0.06]",
      )}
    >
      {/* Label */}
      <span className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400/70 uppercase tracking-widest">
        Fill in
      </span>

      {/* Variable inputs */}
      {variables.map((v, i) => (
        <div key={v.name} className="shrink-0 flex items-center gap-1">
          <label className="text-[11.5px] text-amber-800/70 dark:text-amber-300/50 font-medium">
            {v.name}
          </label>
          <input
            ref={i === 0 ? firstInputRef : undefined}
            value={vals[v.name] ?? ""}
            onChange={(e) =>
              setVals((prev) => ({ ...prev, [v.name]: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder={v.default ?? v.description ?? "…"}
            className={cn(
              "h-6 w-28 px-2 rounded-md text-[12px] outline-none",
              "bg-white dark:bg-white/[0.07]",
              "border border-amber-200 dark:border-white/[0.12]",
              "text-gray-800 dark:text-white/80",
              "placeholder:text-gray-300 dark:placeholder:text-white/25",
              "focus:border-amber-400 dark:focus:border-white/25",
              "transition-colors",
            )}
          />
        </div>
      ))}

      {/* Apply button */}
      <button
        onClick={handleApply}
        className={cn(
          "shrink-0 h-6 px-2.5 rounded-md text-[11.5px] font-semibold",
          "bg-amber-500 dark:bg-amber-500/80 text-white",
          "hover:bg-amber-600 dark:hover:bg-amber-500",
          "transition-colors",
        )}
      >
        Apply
      </button>

      <div className="flex-1" />

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-amber-600/50 dark:text-amber-400/40 hover:text-amber-700 dark:hover:text-amber-300/60 transition-colors"
        title="Skip variables"
      >
        <IconX size={12} />
      </button>
    </div>
  );
}
