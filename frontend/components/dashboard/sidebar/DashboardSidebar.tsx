"use client";

import React, {
  useState,
  useCallback,
  Suspense,
  useEffect,
  useRef,
} from "react";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { useUIStore } from "@/lib/store/ui.store";
import { useFolders, useDraft } from "@/features/mailbox/mailbox.query";
import {
  IconMenu2,
  IconX,
  IconEdit,
  IconTemplate,
  IconChartBar,
  IconInbox,
} from "@tabler/icons-react";
import { Search } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  buildLabelFolders,
  buildSystemFolders,
  FolderItem,
} from "@/lib/helper/sidebarHelper";
import { AccountSwitcher } from "./ui/AccountSwitcher";
import { UserFooter, MobileUserAvatarButton } from "./ui/UserFooter";
import { ComposeDialog } from "@/components/composer/ComposeDialog";
import type { OpenComposerParams } from "@/lib/store/composer.store";
import { InboxZeroQueueDialog } from "@/components/inbox-zero/InboxZeroQueueDialog";
import { useKeyboard } from "@/hooks/keyboard/useKeyboard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
            "rounded-lg animate-pulse bg-app-sidebar-muted",
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
  onOpenTemplates,
  onOpenInsights,
  onOpenInboxZero,
  isInsightsActive,
}: SidebarDataChildProps & {
  activeFolder: string;
  compact: boolean;
  onSelect: (f: string) => void;
  onOpenTemplates: () => void;
  onOpenInsights: () => void;
  onOpenInboxZero: () => void;
  isInsightsActive: boolean;
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
      {/* Tools section */}
      {!compact && <SectionHeader label="Tools" />}
      <div className="flex flex-col gap-0.5 py-1">
        <FolderRow
          item={{
            icon: <IconTemplate size={16} />,
            label: "Templates",
            folder: "tools_templates",
          }}
          isActive={false}
          compact={compact}
          onClick={onOpenTemplates}
        />
        <FolderRow
          item={{
            icon: <IconInbox size={16} />,
            label: "Inbox Zero",
            folder: "tools_inboxzero",
          }}
          isActive={false}
          compact={compact}
          onClick={onOpenInboxZero}
        />
        <FolderRow
          item={{
            icon: <IconChartBar size={16} />,
            label: "Insights",
            folder: "tools_insights",
          }}
          isActive={isInsightsActive}
          compact={compact}
          onClick={onOpenInsights}
        />
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const activeFolder = useUIStore((s) => s.activeFolder);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const setTemplatesBarOpen = useUIStore((s) => s.setTemplatesBarOpen);
  const setMailSearchOpen = useUIStore((s) => s.setMailSearchOpen);
  const inboxZeroOpen = useUIStore((s) => s.inboxZeroOpen);
  const setInboxZeroOpen = useUIStore((s) => s.setInboxZeroOpen);
  const router = useRouter();
  const pathname = usePathname();
  const isInsightsActive = pathname === "/app/insights";

  const [isHovering, setIsHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogs, setDialogs] = useState<
    { key: string; params?: Partial<OpenComposerParams> }[]
  >([]);

  const openCompose = useCallback(
    (params?: Partial<OpenComposerParams>) => {
      if (dialogs.length < 2)
        setDialogs((d) => [...d, { key: crypto.randomUUID(), params }]);
    },
    [dialogs.length],
  );

  const handleSelectFolder = useCallback(
    (folder: string) => {
      setActiveFolder(folder);
      if (pathname !== "/app") router.push("/app");
    },
    [setActiveFolder, pathname, router],
  );

  // N key opens compose (disabled when typing in inputs — handled by useKeyboard)
  useKeyboard("n", () => openCompose(), [openCompose]);

  const isOpen = !collapsed || isHovering || dropdownOpen;
  const noop = () => {};

  return (
    <>
      {/* ── MOBILE TOPBAR ── */}
      <div className="md:hidden flex w-full items-center gap-2 px-3 h-14 shrink-0 bg-app-sidebar-bg border-b border-app-sidebar-border">
        {/* Hamburger — opens drawer */}
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 shrink-0 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-app-sidebar-hover transition-colors"
        >
          <IconMenu2 size={20} />
        </button>

        {/* Inline search bar — opens search modal */}
        <button
          onClick={() => setMailSearchOpen(true)}
          className="flex-1 flex items-center gap-2 h-9 px-3 rounded-xl bg-black/5 dark:bg-white/6 min-w-0 active:opacity-70 transition-opacity"
          aria-label="Search mail"
        >
          <Search
            size={14}
            className="text-gray-400 dark:text-white/30 shrink-0"
          />
          <span className="flex-1 text-[13px] text-gray-400 dark:text-white/30 text-left truncate">
            Search mail…
          </span>
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
                  <AccountSwitcher
                    isOpen={true}
                    onAddAccount={noop}
                    onDropdownOpenChange={noop}
                  />
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
                {/* Compose button */}
                <div className="px-2 pb-2">
                  <button
                    onClick={() => {
                      openCompose();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.97] text-white dark:text-neutral-900 text-[13px] font-semibold transition-all duration-150"
                  >
                    <IconEdit size={14} />
                    Compose
                  </button>
                </div>
                <Suspense fallback={<FolderSkeleton rows={7} />}>
                  <FolderData selectedEmail={selectedEmail}>
                    {({ systemFolders, labelFolders }) => (
                      <FolderList
                        systemFolders={systemFolders}
                        labelFolders={labelFolders}
                        activeFolder={activeFolder}
                        compact={false}
                        onSelect={(f) => {
                          handleSelectFolder(f);
                          setMobileOpen(false);
                        }}
                        onOpenTemplates={() => {
                          setTemplatesBarOpen(true);
                          setMobileOpen(false);
                        }}
                        onOpenInboxZero={() => {
                          setInboxZeroOpen(true);
                          setMobileOpen(false);
                        }}
                        onOpenInsights={() => {
                          router.push("/app/insights");
                          setMobileOpen(false);
                        }}
                        isInsightsActive={isInsightsActive}
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
            onMouseLeave={() => {
              if (!dropdownOpen) setIsHovering(false);
            }}
          >
            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Account switcher — collapse button lives inside */}
              <div
                className={cn(
                  "border-b mb-1 border-app-sidebar-border",
                  !isOpen && "border-transparent",
                )}
              >
                <AccountSwitcher
                  isOpen={isOpen}
                  onAddAccount={noop}
                  onDropdownOpenChange={setDropdownOpen}
                />
              </div>

              {/* Compose button */}
              <div
                className={cn(
                  "py-2",
                  isOpen ? "px-2" : "flex justify-center px-0",
                )}
              >
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openCompose()}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl transition-all duration-150",
                          "bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.97]",
                          "text-white dark:text-neutral-900",
                          isOpen
                            ? "w-full px-3 py-2 text-[13px] font-semibold"
                            : "w-9 h-9",
                        )}
                      >
                        <IconEdit size={15} />
                        {isOpen && <span>Compose</span>}
                      </button>
                    </TooltipTrigger>
                    {!isOpen && (
                      <TooltipContent side="right" className="text-xs">
                        Compose
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
                      onSelect={handleSelectFolder}
                      onOpenTemplates={() => setTemplatesBarOpen(true)}
                      onOpenInboxZero={() => setInboxZeroOpen(true)}
                      onOpenInsights={() => router.push("/app/insights")}
                      isInsightsActive={isInsightsActive}
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

      {/* Compose modals — up to 2 open at once; each is independently closeable */}
      {dialogs.map(({ key, params }) => (
        <ComposeDialog
          key={key}
          openParams={params}
          onClose={() =>
            setDialogs((d) => d.filter((item) => item.key !== key))
          }
        />
      ))}
      <DraftComposerLauncher onOpen={(p) => openCompose(p)} />

      {/* Inbox Zero triage dialog — globally accessible */}
      {inboxZeroOpen && (
        <Suspense fallback={null}>
          <InboxZeroQueueDialog
            open={inboxZeroOpen}
            onClose={() => setInboxZeroOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}

// ─── Draft → ComposeDialog launcher ──────────────────────────────────────────
// Watches UIStore for a pending draft ID. When set, loads the draft (via
// Suspense query) and opens a ComposeDialog pre-populated with its content.

function DraftComposerLauncher({
  onOpen,
}: {
  onOpen: (params: Partial<OpenComposerParams>) => void;
}) {
  const pendingDraftId = useUIStore((s) => s.pendingDraftId);
  const setPendingDraftId = useUIStore((s) => s.setPendingDraftId);

  if (!pendingDraftId) return null;

  return (
    <Suspense fallback={null}>
      <DraftLoader
        id={pendingDraftId}
        onOpen={onOpen}
        onDone={() => setPendingDraftId(null)}
      />
    </Suspense>
  );
}

function DraftLoader({
  id,
  onOpen,
  onDone,
}: {
  id: string;
  onOpen: (params: Partial<OpenComposerParams>) => void;
  onDone: () => void;
}) {
  const { data: draft } = useDraft(id);
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current || !draft) return;
    openedRef.current = true;
    onOpen({
      draftId: draft.id,
      providerDraftId: draft.draftData.providerDraftId,
      initialHtml: draft.bodyHtml,
      subject: draft.subject,
      from: draft.emailAddress,
      provider: draft.provider === "gmail" ? "GOOGLE" : "OUTLOOK",
      to: draft.to.map((r) => ({ email: r.email, name: r.name })),
      cc: draft.cc.map((r) => ({ email: r.email, name: r.name })),
      bcc: draft.bcc.map((r) => ({ email: r.email, name: r.name })),
    });
    onDone();
  }, [draft, onOpen, onDone]);

  return null;
}
