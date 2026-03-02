"use client";

import React, { Suspense } from "react";
import { useCurrentUser } from "@/features/user/user.query";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  MessageSquarePlus,
  Settings,
  Keyboard,
  HelpCircle,
  ExternalLink,
  ChevronsUpDown,
  Zap,
  Layers,
  Minimize2,
} from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useUIStore, LayoutMode } from "@/lib/store/ui.store";

// ── Layout mode config ─────────────────────────────────────────────────────

const LAYOUT_MODES: {
  id: LayoutMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "velocity",
    label: "Velocity",
    icon: <Zap size={12} />,
    description: "Dense, keyboard-first",
  },
  {
    id: "flow",
    label: "Flow",
    icon: <Layers size={12} />,
    description: "Balanced reading",
  },
  {
    id: "zen",
    label: "Zen",
    icon: <Minimize2 size={12} />,
    description: "Focused, minimal",
  },
];

function LayoutModeSwitcher() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);

  return (
    <div className="px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">
        Layout
      </p>
      <div className="grid grid-cols-3 gap-1">
        {LAYOUT_MODES.map((mode) => {
          const isActive = layoutMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setLayoutMode(mode.id)}
              title={mode.description}
              className={cn(
                "flex flex-col items-center cursor-pointer gap-1 px-2 py-2 rounded-md text-center transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-app-sidebar-hover hover:text-neutral-700 dark:hover:text-neutral-200",
              )}
            >
              <span className="shrink-0">{mode.icon}</span>
              <span className="text-[11px] font-medium leading-none">
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared avatar ──────────────────────────────────────────────────────────

function UserAvatar({
  avatar,
  fullName,
  initials,
  size = "sm",
}: {
  avatar?: string;
  fullName?: string;
  initials: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[11px]";
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={fullName ?? ""}
        width={size === "sm" ? 24 : 32}
        height={size === "sm" ? 24 : 32}
        className={cn(
          "rounded-full object-cover shrink-0 ring-1 ring-black/10 dark:ring-white/10",
          dim,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 ring-1 ring-black/10 dark:ring-white/10 font-bold text-white leading-none",
        dim,
      )}
    >
      {initials}
    </div>
  );
}

// ── Shared dropdown content ────────────────────────────────────────────────

export function UserDropdownContent({
  side = "top",
  align = "start",
}: {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const { data } = useCurrentUser();
  const user = data?.user;

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleLogout = () => console.log("logout");
  const handleFeedback = () =>
    window.open("mailto:feedback@yourapp.com?subject=Feedback", "_blank");
  const setShortcutsModalOpen = useUIStore((s) => s.setShortcutsModalOpen);

  return (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={8}
      className="w-56 text-sm"
    >
      {/* User info header */}
      <DropdownMenuLabel className="py-2 px-2">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            avatar={user?.avatar}
            fullName={user?.fullName}
            initials={initials}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
              {user?.fullName ?? "—"}
            </p>
            <p className="text-[10px] font-normal text-neutral-400 dark:text-neutral-500 truncate leading-tight mt-0.5">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      {/* Layout switcher — stays open on interact */}
      <LayoutModeSwitcher />

      <DropdownMenuSeparator />

      <DropdownMenuItem className="gap-2.5 py-2 cursor-pointer">
        <Settings
          size={14}
          className="text-neutral-500 dark:text-neutral-400 shrink-0"
        />
        <span className="text-[12px]">Settings</span>
      </DropdownMenuItem>

      {/* Theme toggle */}
      <AnimatedThemeToggler asMenuItem />

      <DropdownMenuItem
        onClick={() => setShortcutsModalOpen(true)}
        className="gap-2.5 py-2 cursor-pointer"
      >
        <Keyboard
          size={14}
          className="text-neutral-500 dark:text-neutral-400 shrink-0"
        />
        <span className="text-[12px]">Keyboard shortcuts</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={handleFeedback}
        className="gap-2.5 py-2 cursor-pointer"
      >
        <MessageSquarePlus
          size={14}
          className="text-neutral-500 dark:text-neutral-400 shrink-0"
        />
        <span className="text-[12px]">Submit feedback</span>
        <ExternalLink
          size={11}
          className="ml-auto text-neutral-300 dark:text-neutral-600 shrink-0"
        />
      </DropdownMenuItem>

      <DropdownMenuItem className="gap-2.5 py-2 cursor-pointer">
        <HelpCircle
          size={14}
          className="text-neutral-500 dark:text-neutral-400 shrink-0"
        />
        <span className="text-[12px]">Help & support</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={handleLogout}
        variant="destructive"
        className="gap-2.5 py-2 cursor-pointer"
      >
        <LogOut size={14} className="shrink-0" />
        <span className="text-[12px]">Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

// ── Sidebar footer trigger ─────────────────────────────────────────────────

function UserFooterInner({ isOpen }: { isOpen: boolean }) {
  const { data } = useCurrentUser();
  const user = data?.user;

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg transition-colors duration-150 outline-none group",
            "hover:bg-app-sidebar-hover",
            "focus-visible:ring-2 focus-visible:ring-blue-500",
            isOpen ? "px-2.5 py-2 mx-0" : "justify-center w-9 h-9 mx-auto",
          )}
        >
          <UserAvatar
            avatar={user?.avatar}
            fullName={user?.fullName}
            initials={initials}
            size="sm"
          />

          <motion.div
            animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? "auto" : 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden whitespace-nowrap min-w-0 flex-1 text-left"
          >
            <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-200 truncate leading-tight">
              {user?.fullName ?? "—"}
            </p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight">
              {user?.email ?? ""}
            </p>
          </motion.div>

          {isOpen && (
            <ChevronsUpDown
              size={13}
              className="shrink-0 text-neutral-400 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <UserDropdownContent side="top" align="start" />
    </DropdownMenu>
  );
}

// ── Mobile topbar avatar ───────────────────────────────────────────────────

function MobileUserAvatar() {
  const { data } = useCurrentUser();
  const user = data?.user;

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full">
          <UserAvatar
            avatar={user?.avatar}
            fullName={user?.fullName}
            initials={initials}
            size="sm"
          />
        </button>
      </DropdownMenuTrigger>
      <UserDropdownContent side="bottom" align="end" />
    </DropdownMenu>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────────

function UserFooterSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        isOpen ? "px-2.5 py-2 mx-2" : "justify-center mx-auto",
      )}
    >
      <div className="h-6 w-6 rounded-full bg-app-sidebar-muted animate-pulse shrink-0" />
      {isOpen && (
        <div className="space-y-1.5 flex-1">
          <div className="h-2.5 w-20 rounded bg-app-sidebar-muted animate-pulse" />
          <div className="h-2 w-28 rounded bg-app-sidebar-hover animate-pulse" />
        </div>
      )}
    </div>
  );
}

function MobileUserAvatarSkeleton() {
  return (
    <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-app-sidebar-muted animate-pulse" />
  );
}

// ── Exports ────────────────────────────────────────────────────────────────

export function UserFooter({ isOpen }: { isOpen: boolean }) {
  return (
    <Suspense fallback={<UserFooterSkeleton isOpen={isOpen} />}>
      <UserFooterInner isOpen={isOpen} />
    </Suspense>
  );
}

export function MobileUserAvatarButton() {
  return (
    <Suspense fallback={<MobileUserAvatarSkeleton />}>
      <MobileUserAvatar />
    </Suspense>
  );
}
