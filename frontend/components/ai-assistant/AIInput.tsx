"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { IconSend2, IconMicrophone } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface AIInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AIInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask about your emails...",
  className,
}: AIInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-3 py-2.5",
        "bg-white dark:bg-white/5",
        "border border-neutral-200 dark:border-white/10",
        "focus-within:border-neutral-300 dark:focus-within:border-white/20",
        "focus-within:ring-2 focus-within:ring-amber-500/10 dark:focus-within:ring-amber-400/8",
        "rounded-2xl transition-all duration-150 shadow-sm dark:shadow-none",
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-[13px] text-neutral-800 dark:text-[#e2ddd6] placeholder:text-neutral-400 dark:placeholder:text-white/25 outline-none leading-relaxed min-h-5 max-h-30 disabled:opacity-40 transition-opacity font-[450]"
      />
      <div className="flex items-center gap-1 shrink-0 pb-0.5">
        <button
          type="button"
          className="p-1.5 text-neutral-300 dark:text-white/25 hover:text-neutral-500 dark:hover:text-white/55 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-white/6 cursor-pointer"
          tabIndex={-1}
          aria-label="Voice input (coming soon)"
        >
          <IconMicrophone size={15} />
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onSubmit()}
          disabled={!canSubmit}
          className={cn(
            "p-1.5 transition-all duration-150",
            canSubmit
              ? "rounded-xl bg-neutral-900 dark:bg-amber-500 hover:bg-neutral-700 dark:hover:bg-amber-400 text-white dark:text-black hover:scale-105 active:scale-95 cursor-pointer"
              : "rounded-lg bg-neutral-100 dark:bg-white/6 text-neutral-300 dark:text-white/20 cursor-not-allowed",
          )}
          aria-label="Send"
        >
          <IconSend2 size={15} />
        </button>
      </div>
    </div>
  );
}
