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
  Moon,
  Sun,
} from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

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
          "rounded-full object-cover flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10",
          dim,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10 font-bold text-white leading-none",
        dim,
      )}
    >
      {initials}
    </div>
  );
}

// ── Shared dropdown content (used in sidebar footer + mobile topbar) ───────

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

      <DropdownMenuItem className="gap-2.5 py-2 cursor-pointer">
        <Settings
          size={14}
          className="text-neutral-500 dark:text-neutral-400 flex-shrink-0"
        />
        <span className="text-[12px]">Settings</span>
      </DropdownMenuItem>

      {/* Theme toggle — rendered as a proper menu item with AnimatedThemeToggler
          driving only the icon/animation, label handled by us for consistent styling */}
      <AnimatedThemeToggler asMenuItem />

      <DropdownMenuItem className="gap-2.5 py-2 cursor-pointer">
        <Keyboard
          size={14}
          className="text-neutral-500 dark:text-neutral-400 flex-shrink-0"
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
          className="text-neutral-500 dark:text-neutral-400 flex-shrink-0"
        />
        <span className="text-[12px]">Submit feedback</span>
        <ExternalLink
          size={11}
          className="ml-auto text-neutral-300 dark:text-neutral-600 flex-shrink-0"
        />
      </DropdownMenuItem>

      <DropdownMenuItem className="gap-2.5 py-2 cursor-pointer">
        <HelpCircle
          size={14}
          className="text-neutral-500 dark:text-neutral-400 flex-shrink-0"
        />
        <span className="text-[12px]">Help & support</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={handleLogout}
        variant="destructive"
        className="gap-2.5 py-2 cursor-pointer"
      >
        <LogOut size={14} className="flex-shrink-0" />
        <span className="text-[12px]">Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

// ── Sidebar footer trigger (desktop + mobile drawer) ──────────────────────

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
            "hover:bg-[var(--app-sidebar-hover)]",
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
              className="flex-shrink-0 text-neutral-400 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <UserDropdownContent side="top" align="start" />
    </DropdownMenu>
  );
}

// ── Mobile topbar avatar trigger ───────────────────────────────────────────

export function MobileUserAvatar() {
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
      <div className="h-6 w-6 rounded-full bg-[var(--app-sidebar-muted)] animate-pulse flex-shrink-0" />
      {isOpen && (
        <div className="space-y-1.5 flex-1">
          <div className="h-2.5 w-20 rounded bg-[var(--app-sidebar-muted)] animate-pulse" />
          <div className="h-2 w-28 rounded bg-[var(--app-sidebar-hover)] animate-pulse" />
        </div>
      )}
    </div>
  );
}

function MobileUserAvatarSkeleton() {
  return (
    <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-[var(--app-sidebar-muted)] animate-pulse" />
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
