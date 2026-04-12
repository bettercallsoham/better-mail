"use client";

import React, { Suspense, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { IconPlus, IconCheck, IconStack2 } from "@tabler/icons-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  useConnectedAccounts,
  useConnectAccount,
} from "@/features/mailbox/mailbox.query";
import { useCurrentUser } from "@/features/user/user.query";
import { useUIStore } from "@/lib/store/ui.store";
import { ConnectedAccount } from "@/features/mailbox/mailbox.type";
import { AccountAvatar } from "./AccountAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

interface AccountSwitcherProps {
  isOpen: boolean;
  onDropdownOpenChange: (open: boolean) => void;
}

// ── Provider icons ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.32.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-7.76-9.15H9.15v3.31h7.09V2.85zm0 4.9H9.15v1.39h7.09V7.75zm0 2.07H9.15v1.38h7.09V9.82zm-7.09 6.28V14H9.15v2.1h.01zm7.09 0V14h-7.1v2.1h7.1zm0 2.07V16.7h-7.1v1.47h7.1zm0 2.07v-1.38h-7.1v1.38h7.1zm1.38-12.18v12.18h.46q.17 0 .29-.12.11-.12.11-.29V9.82h-.86zm-14.57 3.1q-.8 0-1.39.25-.6.24-1.01.67-.42.44-.63 1.03-.21.6-.21 1.3 0 .66.2 1.24.21.58.61 1.02.4.43.98.67.59.24 1.35.24.73 0 1.3-.23.59-.23 1-.66.43-.44.65-1.03.23-.6.23-1.32 0-.7-.21-1.3-.21-.59-.62-1.02-.4-.43-.98-.67-.58-.24-1.27-.24z"
        fill="#0078D4"
      />
    </svg>
  );
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────

function AllAccountsChip({
  isActive,
  size = "md",
}: {
  isActive: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-app-sidebar-muted text-neutral-600 dark:text-neutral-300",
          size === "sm" ? "h-6 w-6" : "h-8 w-8",
        )}
      >
        <IconStack2 size={size === "sm" ? 13 : 16} stroke={1.5} />
      </div>
      {isActive && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-app-sidebar-bg flex items-center justify-center">
          <svg
            viewBox="0 0 8 8"
            className="h-1.5 w-1.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1.5 4L3 5.5L6.5 2" />
          </svg>
        </span>
      )}
    </div>
  );
}

function ProviderIconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-6 w-6 rounded-md bg-white border border-neutral-200 dark:border-app-sidebar-border dark:bg-app-sidebar-hover flex items-center justify-center shrink-0 shadow-sm">
      {children}
    </div>
  );
}

function Tip({
  children,
  side,
  content,
}: {
  children: React.ReactNode;
  side: "bottom" | "right";
  content: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Add account menu items ────────────────────────────────────────────────────

function AddAccountMenuItems() {
  const { mutate: connectAccount, isPending } = useConnectAccount();
  return (
    <>
      <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-2 pb-1">
        Add account
      </DropdownMenuLabel>
      {[
        {
          provider: "gmail" as const,
          label: "Gmail",
          sub: "Connect Google account",
          Icon: GoogleIcon,
        },
        {
          provider: "outlook" as const,
          label: "Outlook",
          sub: "Connect Microsoft account",
          Icon: OutlookIcon,
        },
      ].map(({ provider, label, sub, Icon }) => (
        <DropdownMenuItem
          key={provider}
          onClick={() => connectAccount(provider)}
          disabled={isPending}
          className="flex items-center gap-3 py-2.5 px-2.5 rounded-lg cursor-pointer"
        >
          <ProviderIconBox>
            <Icon />
          </ProviderIconBox>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{label}</span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {sub}
            </span>
          </div>
          {isPending && (
            <svg
              className="ml-auto h-3.5 w-3.5 animate-spin text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}

// ── Account row used in dropdowns ─────────────────────────────────────────────

function AccountRow({
  account,
  isActive,
  onSwitch,
}: {
  account: ConnectedAccount;
  isActive: boolean;
  onSwitch: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onSwitch}
      className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer"
    >
      <AccountAvatar
        email={account.email}
        avatar={account.avatar_url ?? undefined}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium truncate">
          {account.name || account.email}
        </p>
        {account.name && (
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
            {account.email}
          </p>
        )}
      </div>
      {isActive && (
        <IconCheck size={13} stroke={2.5} className="text-blue-500 shrink-0" />
      )}
    </DropdownMenuItem>
  );
}

const DROPDOWN_CONTENT_CLS =
  "w-60 z-9999 rounded-xl shadow-xl border border-black/7 dark:border-white/8 bg-white dark:bg-[#232120] p-1.5";
const SECTION_LABEL_CLS =
  "text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-2 pb-1";
const DIVIDER = (
  <div className="my-1 h-px bg-neutral-100 dark:bg-white/6 mx-2" />
);

// ── Collapsed sidebar: single dropdown showing all accounts + add ─────────────

function CollapsedAccountDropdown({
  accounts,
  activeEmail,
  isAllAccounts,
  onSwitch,
}: {
  accounts: ConnectedAccount[];
  activeEmail: string | null;
  isAllAccounts: boolean;
  onSwitch: (email: string | null) => void;
}) {
  const activeAccount = accounts.find((a) => a.email === activeEmail) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
          {isAllAccounts ? (
            <AllAccountsChip isActive />
          ) : (
            <AccountAvatar
              email={activeEmail!}
              avatar={activeAccount?.avatar_url ?? undefined}
              isActive
              size="md"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={10}
        className={DROPDOWN_CONTENT_CLS}
      >
        <DropdownMenuLabel className={SECTION_LABEL_CLS}>
          Accounts
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onSwitch(null)}
          className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer"
        >
          <AllAccountsChip isActive={false} size="sm" />
          <span className="flex-1 text-[12.5px]">All accounts</span>
          {isAllAccounts && (
            <IconCheck
              size={13}
              stroke={2.5}
              className="text-blue-500 shrink-0"
            />
          )}
        </DropdownMenuItem>
        {accounts.map((account) => (
          <AccountRow
            key={account.email}
            account={account}
            isActive={account.email === activeEmail}
            onSwitch={() => onSwitch(account.email)}
          />
        ))}
        {DIVIDER}
        <AddAccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Expanded sidebar: inline chips + overflow dropdown ────────────────────────

function AddAccountDropdown({
  overflowAccounts,
  activeEmail,
  onSwitch,
  onOpenChange,
}: {
  overflowAccounts: ConnectedAccount[];
  activeEmail: string | null;
  onSwitch: (email: string | null) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative h-8 w-8 cursor-pointer rounded-lg border border-dashed flex items-center justify-center shrink-0",
            "border-neutral-300 dark:border-app-sidebar-border text-neutral-400 dark:text-neutral-500",
            "hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-app-sidebar-hover hover:border-neutral-400 dark:hover:border-neutral-500",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          )}
        >
          <IconPlus size={14} stroke={2} />
          {overflowAccounts.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-neutral-500 dark:bg-neutral-400 text-white dark:text-neutral-900 text-[9px] font-bold flex items-center justify-center tabular-nums leading-none">
              +{overflowAccounts.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={DROPDOWN_CONTENT_CLS}
      >
        {overflowAccounts.length > 0 && (
          <>
            <DropdownMenuLabel className={SECTION_LABEL_CLS}>
              More accounts
            </DropdownMenuLabel>
            {overflowAccounts.map((account) => (
              <AccountRow
                key={account.email}
                account={account}
                isActive={account.email === activeEmail}
                onSwitch={() => onSwitch(account.email)}
              />
            ))}
            {DIVIDER}
          </>
        )}
        <AddAccountMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const MAX_INLINE_CHIPS = 3;

function AccountSwitcherInner({
  isOpen,
  onDropdownOpenChange,
}: AccountSwitcherProps) {
  const { data: accountsData } = useConnectedAccounts();
  const { data: userData } = useCurrentUser();
  const accountsMemoized = useMemo(
    () => (accountsData?.success ? accountsData.data : []),
    [accountsData],
  );
  const accounts: ConnectedAccount[] = accountsMemoized;
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const setSelectedEmail = useUIStore((s) => s.setSelectedEmailAddress);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const activeAccount = accounts.find((a) => a.email === selectedEmail) ?? null;
  const isAllAccounts = selectedEmail === null;
  const userName = userData?.user?.fullName ?? "—";

  const sortedAccounts = useMemo(() => {
    if (!selectedEmail) return accounts;
    const idx = accounts.findIndex((a) => a.email === selectedEmail);
    if (idx < MAX_INLINE_CHIPS || idx === -1) return accounts; // already visible
    const reordered = [...accounts];
    reordered.splice(idx, 1);
    reordered.unshift(accounts[idx]);
    return reordered;
  }, [accounts, selectedEmail]);

  // then use sortedAccounts instead of accounts for the two slices:
  const inlineAccounts = sortedAccounts.slice(0, MAX_INLINE_CHIPS);
  const overflowAccounts = sortedAccounts.slice(MAX_INLINE_CHIPS);

  const toggleBtn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSidebarCollapsed(!collapsed);
      }}
      className={cn(
        "p-1.5 cursor-pointer rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-app-sidebar-hover",
        collapsed && "mb-3",
      )}
    >
      {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
    </button>
  );

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className={cn(
          "pb-2",
          isOpen ? "px-3 pt-2" : "flex flex-col items-center px-1 pt-2 gap-1.5",
        )}
      >
        {!isOpen ? (
          // ── Collapsed view: toggle on top, then account avatar ──
          <>
            <Tip
              side="right"
              content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {toggleBtn}
            </Tip>
            <CollapsedAccountDropdown
              accounts={accounts}
              activeEmail={selectedEmail}
              isAllAccounts={isAllAccounts}
              onSwitch={setSelectedEmail}
            />
          </>
        ) : (
          // ── Expanded view: chip row + account info ──
          <>
            <div className="flex items-center gap-1.5">
              <Tip side="bottom" content="All accounts">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                >
                  <AllAccountsChip isActive={isAllAccounts} />
                </button>
              </Tip>

              {inlineAccounts.map((account) => (
                <Tip
                  key={account.email}
                  side="bottom"
                  content={
                    account.name
                      ? `${account.name} · ${account.email}`
                      : account.email
                  }
                >
                  <button
                    onClick={() => setSelectedEmail(account.email)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                  >
                    <AccountAvatar
                      email={account.email}
                      avatar={account.avatar_url ?? undefined}
                      isActive={account.email === selectedEmail}
                      size="md"
                    />
                  </button>
                </Tip>
              ))}

              <AddAccountDropdown
                overflowAccounts={overflowAccounts}
                activeEmail={selectedEmail}
                onSwitch={setSelectedEmail}
                onOpenChange={onDropdownOpenChange}
              />

              <Tip
                side="bottom"
                content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <span className="ml-auto">{toggleBtn}</span>
              </Tip>
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={selectedEmail ?? "__all__"}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2.5 pb-0.5 px-0.5">
                  <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                    {isAllAccounts
                      ? userName
                      : activeAccount?.name ||
                        activeAccount?.email?.split("@")[0] ||
                        userName}
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                    {isAllAccounts
                      ? "All accounts"
                      : (activeAccount?.email ?? "")}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function AccountSwitcherSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      className={cn(
        "pb-2",
        isOpen ? "px-3 pt-2" : "flex flex-col items-center px-1 pt-2 gap-1.5",
      )}
    >
      {!isOpen && (
        <div className="h-7 w-7 rounded-md bg-app-sidebar-muted animate-pulse" />
      )}
      <div
        className={cn("flex items-center gap-1.5", !isOpen && "justify-center")}
      >
        {(isOpen ? [0, 1, 2] : [0]).map((i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-lg bg-app-sidebar-muted animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
      {isOpen && (
        <div className="pt-2.5 space-y-1.5 px-0.5">
          <div className="h-3 w-24 rounded bg-app-sidebar-muted animate-pulse" />
          <div className="h-2.5 w-32 rounded bg-app-sidebar-hover animate-pulse" />
        </div>
      )}
    </div>
  );
}

export function AccountSwitcher({
  isOpen,
  onDropdownOpenChange,
}: AccountSwitcherProps) {
  return (
    <Suspense fallback={<AccountSwitcherSkeleton isOpen={isOpen} />}>
      <AccountSwitcherInner
        isOpen={isOpen}
        onDropdownOpenChange={onDropdownOpenChange}
      />
    </Suspense>
  );
}
