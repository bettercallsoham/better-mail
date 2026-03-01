"use client";

import { Suspense } from "react";
import { IconChevronDown, IconCheck, IconX } from "@tabler/icons-react";
import { useComposerStore, type ComposerInstance } from "@/lib/store/composer.store";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import type { ConnectedAccount } from "@/features/mailbox/mailbox.type";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecipientInput } from "./RecipientInput";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function deriveProvider(
  email: string,
  accounts: ConnectedAccount[],
): "GOOGLE" | "OUTLOOK" {
  const acc = accounts.find((a) => a.email === email);
  if (!acc?.provider) return "GOOGLE";
  return acc.provider.toLowerCase() === "outlook" ? "OUTLOOK" : "GOOGLE";
}

function accountColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},60%,55%)`;
}

// ─── From selector (needs Suspense because useConnectedAccounts suspends) ──────

function FromSelectorInner({ instance }: { instance: ComposerInstance }) {
  const store    = useComposerStore();
  const { data } = useConnectedAccounts();
  const accounts = data.success ? data.data : [];

  // Only render the dropdown when there are multiple accounts to pick from
  if (accounts.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-14">From</span>
        <span className="text-[13px] text-gray-700 dark:text-white/70">{instance.from}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-14">From</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.05] px-1.5 py-0.5 -ml-1.5 transition-colors group">
            {/* Avatar dot */}
            <span
              className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
              style={{ background: accountColor(instance.from) }}
            >
              {instance.from.charAt(0).toUpperCase()}
            </span>
            <span className="text-[13px] text-gray-700 dark:text-white/75">
              {instance.from}
            </span>
            <IconChevronDown
              size={11}
              className="text-gray-400 dark:text-white/25 group-hover:text-gray-500 transition-colors"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[240px] z-[1200]">
          {accounts.map((acc) => (
            <DropdownMenuItem
              key={acc.email}
              onClick={() =>
                store.update(instance.id, {
                  from:     acc.email,
                  provider: deriveProvider(acc.email, accounts),
                })
              }
              className="flex items-center gap-2.5 cursor-pointer"
            >
              {/* Mini avatar */}
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                style={{ background: accountColor(acc.email) }}
              >
                {acc.email.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 text-[13px]">{acc.email}</span>
              {acc.email === instance.from && (
                <IconCheck size={12} className="text-blue-500 dark:text-blue-400 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FromSelector({ instance }: { instance: ComposerInstance }) {
  return (
    <Suspense fallback={null}>
      <FromSelectorInner instance={instance} />
    </Suspense>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  instance: ComposerInstance;
}

export function ComposerHeader({ instance }: Props) {
  const store = useComposerStore();
  const { id } = instance;

  return (
    <div className="shrink-0 divide-y divide-black/[0.04] dark:divide-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.06]">

      {/* From — only for new emails, lets user pick sending account */}
      {instance.mode === "new" && <FromSelector instance={instance} />}

      {/* To */}
      <div className="flex items-center">
        <RecipientInput
          label="To"
          recipients={instance.to}
          onAdd={r  => store.addTo(id, r)}
          onRemove={e => store.removeTo(id, e)}
          autoFocus={instance.mode === "new" || instance.mode === "forward"}
        />
        <div className="flex gap-1 pr-3 shrink-0">
          {!instance.showCc && (
            <button onClick={() => store.update(id, { showCc: true })}
              className="text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 px-1.5 py-0.5 rounded transition-colors">
              Cc
            </button>
          )}
          {!instance.showBcc && (
            <button onClick={() => store.update(id, { showBcc: true })}
              className="text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 px-1.5 py-0.5 rounded transition-colors">
              Bcc
            </button>
          )}
        </div>
      </div>

      {/* Cc */}
      {instance.showCc && (
        <div className="flex items-center">
          <RecipientInput
            label="Cc"
            recipients={instance.cc}
            onAdd={r  => store.addCc(id, r)}
            onRemove={e => store.removeCc(id, e)}
          />
          {instance.cc.length === 0 && (
            <button
              onMouseDown={(e) => { e.preventDefault(); store.update(id, { showCc: false }); }}
              className="shrink-0 mr-3 w-4 h-4 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
              title="Remove Cc"
            >
              <IconX size={11} />
            </button>
          )}
        </div>
      )}

      {/* Bcc */}
      {instance.showBcc && (
        <div className="flex items-center">
          <RecipientInput
            label="Bcc"
            recipients={instance.bcc}
            onAdd={r  => store.addBcc(id, r)}
            onRemove={e => store.removeBcc(id, e)}
          />
          {instance.bcc.length === 0 && (
            <button
              onMouseDown={(e) => { e.preventDefault(); store.update(id, { showBcc: false }); }}
              className="shrink-0 mr-3 w-4 h-4 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
              title="Remove Bcc"
            >
              <IconX size={11} />
            </button>
          )}
        </div>
      )}

      {/* Subject — editable for new/forward, read-only label for reply */}
      {(instance.mode === "new" || instance.mode === "forward") ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-14">Subject</span>
          <input
            value={instance.subject}
            onChange={e => store.update(id, { subject: e.target.value })}
            placeholder="Subject"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20"
          />
        </div>
      ) : (
        instance.subject && (
          <div className="px-3 py-1.5">
            <p className="text-[11.5px] text-gray-400 dark:text-white/25 truncate">{instance.subject}</p>
          </div>
        )
      )}
    </div>
  );
}
