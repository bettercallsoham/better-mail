"use client";

import React, { useState, Suspense } from "react";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { useUIStore } from "@/lib/store/ui.store";
import { useFolders } from "@/features/mailbox/mailbox.query";
import {
  IconLayoutSidebarLeftCollapse,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  buildLabelFolders,
  buildSystemFolders,
  FolderItem,
} from "@/lib/helper/sidebarHelper";
import { AccountSwitcher } from "./ui/AccountSwitcher";
import { UserFooter } from "./ui/UserFooter";
// ── Types ──────────────────────────────────────────────────────────────────

type SidebarDataChildProps = {
  systemFolders: FolderItem[];
  labelFolders: FolderItem[];
};

// ── Small pure components ──────────────────────────────────────────────────

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
  compact: boolean; // collapsed icon-only mode
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-colors duration-150 cursor-pointer select-none",
        compact ? "justify-center w-9 h-9 mx-auto" : "px-2.5 py-1.5 mx-2",
        isActive
          ? "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-700 dark:hover:text-neutral-200",
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!compact && (
        <>
          <span className="text-[13px] font-medium flex-1 truncate">
            {item.label}
          </span>
          <CountBadge count={item.count} />
        </>
      )}
    </div>
  );
}

function FolderSkeleton({
  rows = 6,
  compact,
}: {
  rows?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 py-1 px-2",
        compact && "items-center",
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{ opacity: 1 - i * 0.13 }}
          className={cn(
            "rounded-lg animate-pulse bg-neutral-200 dark:bg-neutral-800",
            compact ? "h-9 w-9" : "h-8 w-full",
          )}
        />
      ))}
    </div>
  );
}

// ── Data wrapper ───────────────────────────────────────────────────────────

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

// ── Folder list (shared, desktop+mobile) ──────────────────────────────────

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

// ── Main export ────────────────────────────────────────────────────────────

export function DashboardSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const activeFolder = useUIStore((s) => s.activeFolder);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  const [isHovering, setIsHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOpen = !collapsed || isHovering;

  return (
    <>
      {/* ── MOBILE TOPBAR ── */}
      <div className="md:hidden flex w-full items-center justify-between px-4 h-14 bg-[#f4f4f4] dark:bg-[#0C0C0C] border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
        <IconMenu2
          className="text-neutral-700 dark:text-neutral-200 cursor-pointer"
          onClick={() => setMobileOpen(true)}
        />
        {/* Show just avatar chips on mobile topbar */}
        <AccountSwitcher
          isOpen={false}
          onAddAccount={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      </div>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-[100] flex">
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-[70vw] max-w-[280px] h-full bg-[#f4f4f4] dark:bg-[#0C0C0C] flex flex-col shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-blue-600" />
                  <span className="text-sm font-bold tracking-tight">
                    BetterMail
                  </span>
                </div>
                <IconX
                  size={18}
                  className="text-neutral-500 cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                />
              </div>

              {/* Account switcher */}
              <div className="border-b border-neutral-200 dark:border-neutral-800">
                <AccountSwitcher
                  isOpen
                  onAddAccount={function (): void {
                    throw new Error("Function not implemented.");
                  }}
                />
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
                        onSelect={(f) => {
                          setActiveFolder(f);
                          setMobileOpen(false);
                        }}
                      />
                    )}
                  </FolderData>
                </Suspense>
              </div>
              {/* User footer */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 py-2 flex-shrink-0">
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
            className="justify-between bg-[#f4f4f4] dark:bg-[#0C0C0C] border-r border-neutral-200 dark:border-neutral-800 py-4 overflow-hidden"
            onMouseEnter={() => collapsed && setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Logo + collapse */}
              <div className="flex items-center h-8 mb-3 px-3 flex-shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="h-5 w-5 rounded bg-blue-600 flex-shrink-0" />
                  <motion.span
                    animate={{ opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-bold tracking-tight whitespace-nowrap"
                  >
                    BetterMail
                  </motion.span>
                </div>
                {/* Hide collapse button when already collapsed — hover reveals the sidebar itself */}
                {!!collapsed && (
                  <motion.button
                    onClick={() => {
                      setSidebarCollapsed(!collapsed);
                      setIsHovering(false);
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex-shrink-0"
                  >
                    <IconLayoutSidebarLeftCollapse size={16} />
                  </motion.button>
                )}
              </div>

              {/* Account switcher */}
              <div
                className={cn(
                  "border-b border-neutral-200 dark:border-neutral-800 mb-1",
                  !isOpen && "border-none",
                )}
              >
                <AccountSwitcher
                  isOpen={isOpen}
                  onAddAccount={function (): void {
                    throw new Error("Function not implemented.");
                  }}
                />
              </div>

              {/* Folder list */}
              <Suspense
                fallback={<FolderSkeleton rows={7} compact={!isOpen} />}
              >
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
              <div className="pt-2 mt-auto border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <UserFooter isOpen={isOpen} />
              </div>
            </div>
          </SidebarBody>
        </Sidebar>
      </div>
    </>
  );
}
