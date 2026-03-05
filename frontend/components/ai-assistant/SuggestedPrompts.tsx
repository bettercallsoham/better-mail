"use client";

const PROMPTS = [
  "Show unpaid invoices",
  "Show emails from Stripe",
  "Find recent work emails",
  "What meetings do I have?",
  "Any follow-ups needed?",
  "Summarize my week",
  "Emails needing a reply",
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-neutral-400 dark:text-white/30 uppercase tracking-[0.08em] px-1">
        Try asking
      </p>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-1.5 text-[12px] font-medium text-neutral-500 dark:text-white/60 bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-800 dark:hover:text-white/90 border border-neutral-200 dark:border-white/8 hover:border-neutral-300 dark:hover:border-white/15 rounded-full transition-all duration-150 cursor-pointer select-none"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
