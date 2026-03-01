"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useEmailSuggestions } from "@/features/mailbox/mailbox.query";
import type { ComposerRecipient } from "@/lib/store/composer.store";
import { X } from "lucide-react";

// Allow blur-to-commit while letting suggestion mouseDown fire first
const BLUR_COMMIT_DELAY_MS = 150;

interface RecipientInputProps {
  label:      string;
  recipients: ComposerRecipient[];
  onAdd:      (r: ComposerRecipient) => void;
  onRemove:   (email: string) => void;
  autoFocus?: boolean;
}

export function RecipientInput({
  label,
  recipients,
  onAdd,
  onRemove,
  autoFocus,
}: RecipientInputProps) {
  const [input,       setInput]       = useState("");
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger on 1+ chars for near-instant suggestions
  const { data: suggestions = [] } = useEmailSuggestions(
    input.length >= 1 ? input : undefined,
    8,
  );

  const commit = useCallback(
    (email: string, name?: string) => {
      const clean = email.trim().toLowerCase();
      if (!clean.includes("@")) return;
      if (!recipients.find((r) => r.email === clean)) {
        onAdd({ email: clean, name });
      }
      setInput("");
      setOpen(false);
    },
    [recipients, onAdd],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (open && suggestions[highlighted]) {
          commit(suggestions[highlighted].email, suggestions[highlighted].name);
        } else {
          commit(input);
        }
      }
      if (e.key === "Backspace" && !input && recipients.length > 0) {
        onRemove(recipients[recipients.length - 1].email);
      }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, suggestions.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
      if (e.key === "Escape")    { setOpen(false); }
    },
    [input, recipients, suggestions, highlighted, open, commit, onRemove],
  );

  return (
    <div className="relative flex-1">
      <div
        className="flex flex-wrap items-center gap-1 px-3 py-2 min-h-9 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Field label */}
        <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-5">
          {label}
        </span>

        {/* Recipient pills */}
        {recipients.map((r) => {
          const hue = r.email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
          return (
            <span
              key={r.email}
              className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900 text-[12px] font-medium max-w-[200px] shrink-0"
            >
              <span
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-bold"
                style={{ background: `hsl(${hue} 45% 65%)`, color: "white" }}
              >
                {r.email[0].toUpperCase()}
              </span>
              <span className="truncate">{r.name ?? r.email}</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onRemove(r.email); }}
                className="opacity-50 hover:opacity-100 transition-opacity flex items-center ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}

        {/* Text input */}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={handleKey}
          onBlur={() =>
            setTimeout(() => {
              if (input) commit(input);
              setOpen(false);
            }, BLUR_COMMIT_DELAY_MS)
          }
          placeholder={recipients.length === 0 ? "Add recipients…" : ""}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-[13px] text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20"
        />
      </div>

      {/* Suggestions dropdown */}
      {open && input && (
        <div className={cn(
          "absolute left-0 right-0 top-full z-50 mt-1 rounded-xl overflow-hidden",
          "bg-white dark:bg-[#1e1e1e]",
          "border border-black/[0.06] dark:border-white/[0.07]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_8px_32px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.3)]",
          "animate-in fade-in-0 slide-in-from-top-1 duration-150",
        )}>
          {suggestions.length > 0 ? (
            <div className="max-h-52 overflow-y-auto py-1">
              {suggestions.map((s, i) => {
                const hue = s.email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                return (
                  <button
                    key={s.email}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); commit(s.email, s.name); }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                      i === highlighted
                        ? "bg-blue-50 dark:bg-blue-950/25"
                        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]",
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
                      style={{ background: `hsl(${hue} 50% 58%)` }}
                    >
                      {(s.name?.[0] ?? s.email[0]).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {s.name && (
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white/90 truncate leading-tight">
                          {s.name}
                        </p>
                      )}
                      <p className={cn(
                        "truncate leading-tight",
                        s.name
                          ? "text-[11.5px] text-gray-400 dark:text-white/35"
                          : "text-[13px] font-medium text-gray-900 dark:text-white/90",
                      )}>
                        {s.email}
                      </p>
                    </div>
                    {i === highlighted && (
                      <kbd className="text-[9px] font-mono text-gray-300 dark:text-white/20 shrink-0 ml-auto">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-[12px] text-gray-400 dark:text-white/30">
              No matches for{" "}
              <span className="font-medium text-gray-600 dark:text-white/50">
                &ldquo;{input}&rdquo;
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
