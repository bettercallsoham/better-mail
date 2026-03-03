"use client";

import { Suspense } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { ChevronDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string | undefined;
  onChange: (email: string | undefined) => void;
}

function AccountSelectorInner({ value, onChange }: Props) {
  const { data } = useConnectedAccounts();
  const accounts = data?.data ?? [];

  const displayLabel = value ?? "All accounts";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
          <Inbox size={12} className="text-neutral-400 shrink-0" />
          <span className="max-w-35 truncate">{displayLabel}</span>
          <ChevronDown size={12} className="text-neutral-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem
          onSelect={() => onChange(undefined)}
          className={cn(
            "text-[13px]",
            value === undefined &&
              "font-medium text-neutral-900 dark:text-neutral-50",
          )}
        >
          All accounts
        </DropdownMenuItem>
        {accounts.length > 0 && <DropdownMenuSeparator />}
        {accounts.map((acc) => (
          <DropdownMenuItem
            key={acc.id}
            onSelect={() => onChange(acc.email)}
            className={cn(
              "text-[13px] truncate",
              value === acc.email &&
                "font-medium text-neutral-900 dark:text-neutral-50",
            )}
          >
            {acc.email}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountSelector({ value, onChange }: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-8 w-32 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      }
    >
      <AccountSelectorInner value={value} onChange={onChange} />
    </Suspense>
  );
}
