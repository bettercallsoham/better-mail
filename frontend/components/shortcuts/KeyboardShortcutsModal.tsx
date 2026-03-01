"use client";

import { useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// ─── Data ──────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "Navigate",
    rows: [
      { keys: ["J", "K"],        label: "Next / previous thread"    },
      { keys: ["↵"],             label: "Open focused thread"        },
      { keys: ["U"],             label: "Close thread / mark read"   },
      { keys: ["Esc"],           label: "Close current view"         },
    ],
  },
  {
    title: "Thread",
    rows: [
      { keys: ["R"],             label: "Reply"                      },
      { keys: ["F"],             label: "Forward"                    },
      { keys: ["E"],             label: "Archive"                    },
      { keys: ["S"],             label: "Star / unstar"              },
      { keys: ["#"],             label: "Delete"                     },
    ],
  },
  {
    title: "Compose",
    rows: [
      { keys: ["N"],             label: "New email"                  },
      { keys: ["⌘", "↵"],        label: "Send"                      },
      { keys: ["⌘", "⇧", "D"],   label: "Discard draft"             },
    ],
  },
  {
    title: "Go to",
    rows: [
      { keys: ["G", "I"],        label: "Inbox"                      },
      { keys: ["G", "S"],        label: "Starred"                    },
      { keys: ["G", "T"],        label: "Sent"                       },
      { keys: ["G", "D"],        label: "Drafts"                     },
      { keys: ["G", "A"],        label: "Archive"                    },
    ],
  },
  {
    title: "App",
    rows: [
      { keys: ["⌘", "K"],        label: "Search"                     },
      { keys: ["`"],             label: "Toggle sidebar"             },
      { keys: ["⌘", "1–3"],      label: "Switch account"             },
      { keys: ["⌘", "0"],        label: "All accounts"               },
      { keys: ["?"],             label: "Open this help"             },
    ],
  },
] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

function Key({ children }: { children: string }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center",
      "min-w-[24px] h-[22px] px-1.5 rounded-md",
      "text-[11px] font-semibold font-mono",
      "bg-gray-100 dark:bg-white/[0.08]",
      "text-gray-600 dark:text-white/55",
      "ring-1 ring-black/[0.08] dark:ring-white/[0.1]",
      "shadow-[0_1px_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_rgba(0,0,0,0.5)]",
    )}>
      {children}
    </span>
  );
}

function Row({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-4">
      <span className="text-[13px] text-gray-500 dark:text-white/42 flex-1 min-w-0">
        {label}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && keys.length > 1 && !(keys[0] === "G") && (
              <span className="text-[10px] text-gray-300 dark:text-white/20">+</span>
            )}
            <Key>{k}</Key>
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: readonly { keys: readonly string[]; label: string }[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/25 mb-1 px-1">
        {title}
      </p>
      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {rows.map((row) => (
          <Row key={row.label} keys={row.keys} label={row.label} />
        ))}
      </div>
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  // Split sections into two columns
  const left  = SECTIONS.slice(0, 3);
  const right = SECTIONS.slice(3);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        "relative w-full max-w-[680px] rounded-2xl overflow-hidden",
        "bg-white dark:bg-[#1c1c1c]",
        "shadow-[0_24px_64px_-8px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_24px_80px_-8px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)]",
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              "bg-gray-100 dark:bg-white/[0.08]",
            )}>
              <span className="text-[13px]">⌨</span>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white/90 leading-tight tracking-[-0.01em]">
                Keyboard Shortcuts
              </p>
              <p className="text-[11.5px] text-gray-400 dark:text-white/30">
                Navigate everything without a mouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-xl",
              "text-gray-400 dark:text-white/30",
              "hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
              "hover:text-gray-600 dark:hover:text-white/55",
              "transition-colors",
            )}
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Body — two-column grid */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-black/[0.05] dark:divide-white/[0.05]">
          <div className="px-6 py-5 space-y-5">
            {left.map((s) => <Section key={s.title} title={s.title} rows={s.rows} />)}
          </div>
          <div className="px-6 py-5 space-y-5">
            {right.map((s) => <Section key={s.title} title={s.title} rows={s.rows} />)}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between">
          <p className="text-[11.5px] text-gray-300 dark:text-white/20 select-none">
            Press <Key>?</Key> <span className="mx-1">or</span> <Key>Esc</Key> to close
          </p>
          <p className="text-[10.5px] text-gray-200 dark:text-white/15 font-mono select-none">
            betterMail
          </p>
        </div>
      </div>
    </div>
  );
}
