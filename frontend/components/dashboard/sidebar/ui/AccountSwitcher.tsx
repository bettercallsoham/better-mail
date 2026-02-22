"use client";

import React, { Suspense } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconPlus, IconDotsVertical, IconCheck } from "@tabler/icons-react";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import { useCurrentUser } from "@/features/user/user.query";
import { useUIStore } from "@/lib/store/ui.store";
import { ConnectedAccount } from "@/features/mailbox/mailbox.type";
import { AccountAvatar } from "./AccountAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

// ── Props ──────────────────────────────────────────────────────────────────

interface AccountSwitcherProps {
  isOpen: boolean;
  onAddAccount: () => void;
}

// ── Inner (suspended) ──────────────────────────────────────────────────────

function AccountSwitcherInner({ isOpen, onAddAccount }: AccountSwitcherProps) {
  const { data: accountsData } = useConnectedAccounts();
  const { data: userData } = useCurrentUser();

  const accounts: ConnectedAccount[] = accountsData?.success
    ? accountsData.data
    : [];

  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const setSelectedEmail = useUIStore((s) => s.setSelectedEmailAddress);

  const activeEmail = selectedEmail ?? accounts[0]?.email ?? null;
  const activeAccount =
    accounts.find((a) => a.email === activeEmail) ?? accounts[0];

  const userName = userData?.user?.fullName ?? activeEmail ?? "—";

  const handleSwitch = (account: ConnectedAccount) => {
    setSelectedEmail(account.email);
  };

  return (
    <div className={cn("pt-3 pb-2", isOpen ? "px-3" : "flex flex-col items-center px-1")}>

      {!isOpen ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={activeAccount?.email}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
            >
              <AccountAvatar email={activeAccount?.email ?? ""} isActive size="md" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={10} className="w-52 text-sm">
            {accounts.map((account) => (
              <DropdownMenuItem
                key={account.email}
                onClick={() => handleSwitch(account)}
                className="gap-2.5 py-2 cursor-pointer"
              >
                <AccountAvatar email={account.email} size="sm" />
                <span className="flex-1 truncate text-[12px]">{account.email}</span>
                {account.email === activeEmail && (
                  <IconCheck size={13} stroke={2.5} className="text-blue-500 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAddAccount}
              className="gap-2.5 py-2 cursor-pointer text-neutral-500 dark:text-neutral-400"
            >
              <div className="h-6 w-6 rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-shrink-0">
                <IconPlus size={12} stroke={2} />
              </div>
              <span className="text-[12px]">Add account</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      ) : (
        <>
          <div className="flex items-center gap-1.5">
            {accounts.map((account) => (
              <button
                key={account.email}
                onClick={() => handleSwitch(account)}
                title={account.email}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                <AccountAvatar
                  email={account.email}
                  isActive={account.email === activeEmail}
                  size="md"
                />
              </button>
            ))}

            <button
              onClick={onAddAccount}
              title="Add account"
              className={cn(
                "h-8 w-8 rounded-lg border border-dashed",
                "border-neutral-300 dark:border-neutral-600",
                "flex items-center justify-center flex-shrink-0",
                "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                "hover:border-neutral-400 dark:hover:border-neutral-500",
                "transition-colors duration-150 focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-blue-500",
              )}
            >
              <IconPlus size={14} stroke={2} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "ml-auto p-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none",
                  "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                  "hover:bg-neutral-200 dark:hover:bg-neutral-800",
                )}>
                  <IconDotsVertical size={14} stroke={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="w-52 text-sm">
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.email}
                    onClick={() => handleSwitch(account)}
                    className="gap-2.5 py-2 cursor-pointer"
                  >
                    <AccountAvatar email={account.email} size="sm" />
                    <span className="flex-1 truncate text-[12px]">{account.email}</span>
                    {account.email === activeEmail && (
                      <IconCheck size={13} stroke={2.5} className="text-blue-500 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onAddAccount}
                  className="gap-2.5 py-2 cursor-pointer text-neutral-500 dark:text-neutral-400"
                >
                  <div className="h-6 w-6 rounded-md border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-shrink-0">
                    <IconPlus size={12} stroke={2} />
                  </div>
                  <span className="text-[12px]">Add account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AnimatePresence initial={false}>
            {activeAccount && (
              <motion.div
                key={activeAccount.email}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2.5 pb-0.5 px-0.5">
                  <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                    {activeAccount.email}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function AccountSwitcherSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <div className={cn("pt-3 pb-2", isOpen ? "px-3" : "flex flex-col items-center px-1")}>
      <div className={cn("flex items-center gap-1.5", !isOpen && "justify-center")}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse"
          />
        ))}
      </div>
      {isOpen && (
        <div className="pt-2.5 space-y-1.5 px-0.5">
          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-2.5 w-32 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export function AccountSwitcher({ isOpen, onAddAccount }: AccountSwitcherProps) {
  return (
    <Suspense fallback={<AccountSwitcherSkeleton isOpen={isOpen} />}>
      <AccountSwitcherInner isOpen={isOpen} onAddAccount={onAddAccount} />
    </Suspense>
  );
}