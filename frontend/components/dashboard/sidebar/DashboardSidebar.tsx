"use client";

import React, { useState, Suspense } from "react";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { useUIStore } from "@/lib/store/ui.store";
import { useFolders } from "@/features/mailbox/mailbox.query";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  buildLabelFolders,
  buildSystemFolders,
  FolderItem,
} from "@/lib/helper/sidebarHelper";
import { AccountSwitcher } from "./ui/AccountSwitcher";
import { UserFooter, MobileUserAvatarButton } from "./ui/UserFooter";

type SidebarDataChildProps = {
  systemFolders: FolderItem[];
  labelFolders: FolderItem[];
};

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto text-[10px] font-medium tabular-nums text-neutral-400 dark:text-neutral-500">
      {count > 999 ? "999+" : count}
    </span>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
      {label}
    </p>
  );
}

function FolderRow({
  item,
  isActive,
  compact,
  onClick,
}: {
  item: FolderItem;
  isActive: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-colors duration-150 cursor-pointer select-none",
        compact ? "justify-center w-9 h-9 mx-auto" : "px-2.5 py-1.5 mx-2",
        isActive
          ? "bg-app-sidebar-active text-neutral-900 dark:text-neutral-100"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-app-sidebar-hover hover:text-neutral-700 dark:hover:text-neutral-200",
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!compact && (
        <>
          <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
          <CountBadge count={item.count} />
        </>
      )}
    </div>
  );
}

function FolderSkeleton({ rows = 6, compact }: { rows?: number; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-0.5 py-1 px-2", compact && "items-center")}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{ opacity: 1 - i * 0.13 }}
          className={cn(
            "rounded-lg animate-pulse bg-[var(--app-sidebar-muted)]",
            compact ? "h-9 w-9" : "h-8 w-full",
          )}
        />
      ))}
    </div>
  );
}

function FolderData({
  selectedEmail,
  children,
}: {
  selectedEmail: string | null;
  children: (props: SidebarDataChildProps) => React.ReactNode;
}) {
  const { data } = useFolders(selectedEmail ?? undefined);
  const system = data?.success ? data.data.system : undefined;
  const labels = data?.success ? data.data.labels : undefined;
  return (
    <>
      {children({
        systemFolders: buildSystemFolders(system),
        labelFolders: buildLabelFolders(labels),
      })}
    </>
  );
}

function FolderList({
  systemFolders,
  labelFolders,
  activeFolder,
  compact,
  onSelect,
}: SidebarDataChildProps & {
  activeFolder: string;
  compact: boolean;
  onSelect: (f: string) => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden min-h-0">
      {!compact && <SectionHeader label="Conversations" />}
      <div className="flex flex-col gap-0.5 py-1">
        {systemFolders.map((item) => (
          <FolderRow
            key={item.folder}
            item={item}
            isActive={activeFolder === item.folder}
            compact={compact}
            onClick={() => onSelect(item.folder)}
          />
        ))}
      </div>
      {!compact && labelFolders.length > 0 && (
        <>
          <SectionHeader label="Labels" />
          <div className="flex flex-col gap-0.5 py-1">
            {labelFolders.map((item) => (
              <FolderRow
                key={item.folder}
                item={item}
                isActive={activeFolder === item.folder}
                compact={false}
                onClick={() => onSelect(item.folder)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const activeFolder = useUIStore((s) => s.activeFolder);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  const [isHovering, setIsHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isOpen = !collapsed || isHovering || dropdownOpen;
  const noop = () => {};

  return (
    <>
      {/* ── MOBILE TOPBAR ── */}
      <div className="md:hidden flex w-full items-center justify-between px-4 h-14 shrink-0 bg-app-sidebar-bg border-b border-app-sidebar-border">
        {/* Hamburger — opens drawer */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 -ml-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-app-sidebar-hover transition-colors"
        >
          <IconMenu2 size={20} />
        </button>

        {/* User avatar — opens user dropdown directly */}
        <MobileUserAvatarButton />
      </div>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-100 flex">
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-[75vw] max-w-75 h-full flex flex-col shadow-2xl bg-app-sidebar-bg"
            >
              {/* Drawer header: account switcher + X close */}
              <div className="border-b border-app-sidebar-border flex items-start">
                <div className="flex-1 min-w-0">
                  <AccountSwitcher isOpen={true} onAddAccount={noop} onDropdownOpenChange={noop} />
                </div>
                {/* X button — top-right of drawer */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 mr-3 shrink-0 p-1.5 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-app-sidebar-hover transition-colors"
                >
                  <IconX size={16} />
                </button>
              </div>

              {/* Folders */}
              <div className="flex-1 overflow-y-auto py-2">
                <Suspense fallback={<FolderSkeleton rows={7} />}>
                  <FolderData selectedEmail={selectedEmail}>
                    {({ systemFolders, labelFolders }) => (
                      <FolderList
                        systemFolders={systemFolders}
                        labelFolders={labelFolders}
                        activeFolder={activeFolder}
                        compact={false}
                        onSelect={(f) => { setActiveFolder(f); setMobileOpen(false); }}
                      />
                    )}
                  </FolderData>
                </Suspense>
              </div>

              {/* User footer — same as desktop */}
              <div className="border-t border-app-sidebar-border py-2 shrink-0">
                <UserFooter isOpen={true} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block h-full">
        <Sidebar open={isOpen} setOpen={setIsHovering} animate>
          <SidebarBody
            className="justify-between border-r py-4 overflow-hidden bg-app-sidebar-bg border-app-sidebar-border"
            onMouseEnter={() => collapsed && setIsHovering(true)}
            onMouseLeave={() => { if (!dropdownOpen) setIsHovering(false); }}
          >
            <div className="flex flex-col flex-1 overflow-hidden min-h-0">

              {/* Account switcher — collapse button lives inside */}
              <div className={cn(
                "border-b mb-1 border-app-sidebar-border",
                !isOpen && "border-transparent",
              )}>
                <AccountSwitcher
                  isOpen={isOpen}
                  onAddAccount={noop}
                  onDropdownOpenChange={setDropdownOpen}
                />
              </div>

              {/* Folder list */}
              <Suspense fallback={<FolderSkeleton rows={7} compact={!isOpen} />}>
                <FolderData selectedEmail={selectedEmail}>
                  {(props) => (
                    <FolderList
                      {...props}
                      activeFolder={activeFolder}
                      compact={!isOpen}
                      onSelect={setActiveFolder}
                    />
                  )}
                </FolderData>
              </Suspense>

              {/* User footer */}
              <div className="pt-2 mt-auto border-t border-app-sidebar-border shrink-0">
                <UserFooter isOpen={isOpen} />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      </div>
    </>
  );
}