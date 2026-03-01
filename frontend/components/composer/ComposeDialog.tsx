"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
  IconX,
  IconArrowsMaximize,
  IconArrowsMinimize,
} from "@tabler/icons-react";
import Draggable, { type DraggableEventHandler } from "react-draggable";
import { cn } from "@/lib/utils";
import { useComposerStore } from "@/lib/store/composer.store";
import { useUIStore } from "@/lib/store/ui.store";
import { useConnectedAccounts } from "@/features/mailbox/mailbox.query";
import type { ConnectedAccount } from "@/features/mailbox/mailbox.type";
import { ComposerHeader } from "./ComposerHeader";
import { ComposerEditor } from "./ComposerEditor";
import { ComposerFooter } from "./ComposerFooter";

// ─── Constants ──────────────────────────────────────────────────────────────────
const POPUP_W = 580;
const POPUP_H = 520;
const MARGIN = 16;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function deriveProvider(
  email: string,
  accounts: ConnectedAccount[],
): "GOOGLE" | "OUTLOOK" {
  const acc = accounts.find((a) => a.email === email);
  if (!acc?.provider) return "GOOGLE";
  return acc.provider.toLowerCase() === "outlook" ? "OUTLOOK" : "GOOGLE";
}

// ─── Inner body ────────────────────────────────────────────────────────────────
// Needs Suspense because useConnectedAccounts is a suspense query.
// IMPORTANT: This component must stay mounted through fullscreen toggles so
// the typed content and store instance are never lost.

function ComposeDialogInner({
  onClose,
  isFullscreen,
}: {
  onClose: () => void;
  isFullscreen: boolean;
}) {
  const { data } = useConnectedAccounts();
  const accounts = data.success ? data.data : [];
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  const defaultFrom = selectedEmail ?? accounts[0]?.email ?? "";
  const defaultProvider = deriveProvider(defaultFrom, accounts);

  // Lazy-init: create exactly one store instance per mount of this component.
  const [instanceId] = useState<string>(() =>
    useComposerStore.getState().open({
      shell: "dialog",
      mode: "new",
      from: defaultFrom,
      provider: defaultProvider,
    }),
  );

  // Clean up the store instance when dialog unmounts.
  useEffect(() => {
    return () => {
      useComposerStore.getState().close(instanceId);
    };
  }, [instanceId]);

  const instance = useComposerStore((s) =>
    s.instances.find((i) => i.id === instanceId),
  );

  if (!instance) return null;

  return (
    <>
      <ComposerHeader instance={instance} />
      <div
        className={cn(
          "px-4 py-3 overflow-y-auto",
          isFullscreen ? "flex-1" : "max-h-[360px]",
        )}
      >
        <ComposerEditor
          instance={instance}
          minHeight={isFullscreen ? 400 : 200}
        />
      </div>
      <ComposerFooter instance={instance} onClose={onClose} />
    </>
  );
}

// ─── Skeleton while accounts load ─────────────────────────────────────────────

function DialogSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4 py-4">
      <div className="h-8 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />
      <div className="h-8 bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />
      <div className="h-[200px] bg-black/[0.04] dark:bg-white/[0.05] rounded-lg" />
    </div>
  );
}

// ─── Title bar button ─────────────────────────────────────────────────────────

function TitleBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
        "text-gray-400 dark:text-white/30",
        danger
          ? "hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-red-500 dark:hover:text-red-400"
          : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-gray-600 dark:hover:text-white/55",
      )}
    >
      {children}
    </button>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

interface ComposeDialogProps {
  onClose: () => void;
}

export function ComposeDialog({ onClose }: ComposeDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Controlled drag position — persists across fullscreen toggles so popup
  // returns to the same spot when exiting fullscreen.
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  // Escape closes (only when not focused in an input/textarea/editor)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      )
        return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDrag: DraggableEventHandler = (_, data) => {
    setDragPos({ x: data.x, y: data.y });
  };

  return (
    <>
      {/* Fullscreen backdrop — rendered behind the popup, pointer-events-none
          so it doesn't capture clicks and close the dialog unexpectedly */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/60 pointer-events-none"
          style={{ zIndex: 1099 }}
        />
      )}

      {/*
        Single Draggable — always mounted so ComposeDialogInner never remounts.
        In fullscreen: position reset to (0,0) + CSS fills the viewport inset.
        In popup: position = last drag offset + CSS anchors bottom-right.
      */}
      <Draggable
        handle=".compose-drag-handle"
        nodeRef={nodeRef}
        disabled={isFullscreen}
        position={isFullscreen ? { x: 0, y: 0 } : dragPos}
        onDrag={handleDrag}
      >
        <div
          ref={nodeRef}
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl",
            "bg-white dark:bg-[#1c1c1c]",
            isFullscreen
              ? "shadow-[0_24px_80px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]"
              : "shadow-[0_8px_40px_rgba(0,0,0,0.16),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
          )}
          style={
            isFullscreen
              ? // Fill viewport with margin; position: fixed + inset handles centering
                {
                  position: "fixed",
                  inset: 40,
                  width: "auto",
                  height: "auto",
                  zIndex: 1100,
                }
              : // Anchored bottom-right; Draggable translate shifts from here
                {
                  position: "fixed",
                  bottom: MARGIN,
                  right: MARGIN,
                  width: POPUP_W,
                  height: POPUP_H,
                  zIndex: 1100,
                }
          }
        >
          {/* Title bar — drag handle when not fullscreen */}
          <div
            className={cn(
              "compose-drag-handle shrink-0 flex items-center justify-between px-4 h-12 select-none",
              "border-b border-black/[0.06] dark:border-white/[0.06]",
              isFullscreen
                ? "cursor-default"
                : "cursor-grab active:cursor-grabbing",
            )}
          >
            <span className="text-[13px] font-semibold text-gray-700 dark:text-white/75">
              New Message
            </span>
            <div
              className="flex items-center gap-0.5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <TitleBtn
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <IconArrowsMinimize size={13} />
                ) : (
                  <IconArrowsMaximize size={13} />
                )}
              </TitleBtn>
              <TitleBtn onClick={onClose} title="Close" danger>
                <IconX size={13} />
              </TitleBtn>
            </div>
          </div>

          {/* Body — always mounted, state preserved through fullscreen toggle */}
          <Suspense fallback={<DialogSkeleton />}>
            <ComposeDialogInner onClose={onClose} isFullscreen={isFullscreen} />
          </Suspense>
        </div>
      </Draggable>
    </>
  );
}
