"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
// Using your existing hook from mailbox.query.ts
import { useEmailSuggestions } from "@/features/mailbox/mailbox.query";
import type { ComposerRecipient } from "@/lib/store/composer.store";

const BLUR_COMMIT_DELAY_MS = 150; // time to allow mouseDown on suggestion to fire before blur closes dropdown

interface RecipientInputProps {
  label: string;
  recipients: ComposerRecipient[];
  onAdd: (r: ComposerRecipient) => void;
  onRemove: (email: string) => void;
  autoFocus?: boolean;
}

export function RecipientInput({
  label,
  recipients,
  onAdd,
  onRemove,
  autoFocus,
}: RecipientInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // useEmailSuggestions from your mailbox.query.ts — enabled when input.length > 1
  const { data: suggestions = [] } = useEmailSuggestions(
    input.length > 1 ? input : undefined,
    6,
  );

  const commit = useCallback(
    (email: string, name?: string) => {
      const clean = email.trim().toLowerCase();
      if (!clean.includes("@")) return;
      if (!recipients.find((r) => r.email === clean))
        onAdd({ email: clean, name });
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
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [input, recipients, suggestions, highlighted, open, commit, onRemove],
  );

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1 px-3 py-2 min-h-9 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-5">
          {label}
        </span>

        {recipients.map((r) => (
          <span
            key={r.email}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-[12px] text-gray-700 dark:text-white/75 max-w-[200px]"
          >
            <span className="truncate">{r.name ?? r.email}</span>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(r.email);
              }}
              className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60"
            >
              <IconX size={11} />
            </button>
          </span>
        ))}

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
          className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl overflow-hidden bg-white dark:bg-[#1e1e1e] shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]">
          {suggestions.map((s, i) => (
            <button
              key={s.email}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s.email, s.name);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                i === highlighted
                  ? "bg-gray-50 dark:bg-white/[0.06]"
                  : "hover:bg-gray-50 dark:hover:bg-white/[0.04]",
              )}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {(s.name?.[0] ?? s.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {s.name && (
                  <p className="text-[12.5px] font-medium text-gray-800 dark:text-white/85 truncate">
                    {s.name}
                  </p>
                )}
                <p className="text-[11.5px] text-gray-400 dark:text-white/35 truncate">
                  {s.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
