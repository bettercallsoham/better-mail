"use client";

import { Suspense, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  IconStar,
  IconStarFilled,
  IconCircle,
  IconCircleFilled,
  IconArchive,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconSparkles,
} from "@tabler/icons-react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail,
  useToggleStar,
  useToggleRead,
  useArchiveThread,
  useDeleteThread,
} from "@/features/mailbox/mailbox.query";
import { useThreadSummary } from "@/features/ai/ai.query";
import type { FullEmail, EmailLabel } from "@/features/mailbox/mailbox.type";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Sender avatar ────────────────────────────────────────────────J────────────
function Avatar({ name, email, size = 8 }: { name?: string; email: string; size?: number }) {
  const hue      = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = (name || email).slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-white",
        `w-${size} h-${size}`,
      )}
      style={{ background: `hsl(${hue} 52% 46%)` }}
    >
      {initials}
    </span>
  );
}

// ─── Small toolbar button ─────────────────────────────────────────────────────
interface ToolBtnProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeClass?: string;
  className?: string;
  children: React.ReactNode;
}

function ToolBtn({
  label, onClick, disabled, active, activeClass, className, children,
}: ToolBtnProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center",
        "text-gray-400 dark:text-white/30",
        "hover:bg-black/6 dark:hover:bg-white/8",
        "hover:text-gray-700 dark:hover:text-white/70",
        "disabled:opacity-25 disabled:cursor-not-allowed",
        "transition-all duration-100",
        active && activeClass,
        className,
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-black/8 dark:bg-white/8 mx-0.5 shrink-0" />;
}

// ─── Fast iframe body — no horizontal scroll, instant resize ──────────────────
function IframeBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const fit = useCallback((iframe: HTMLIFrameElement) => {
    const body = iframe.contentDocument?.body;
    if (!body) return;
    iframe.style.height = "0px";
    iframe.style.height = `${body.scrollHeight + 8}px`;
  }, []);

  const srcDoc = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
  *  { box-sizing: border-box; word-break: break-word; }
  html, body {
    margin: 0; padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px; line-height: 1.6; color: #374151;
    background: #fff; color-scheme: light;
    /* Kill horizontal scrollbar */
    overflow-x: hidden;
    max-width: 100%;
  }
  img  { max-width: 100% !important; height: auto; display: block; }
  a    { color: #2563eb; }
  /* Strip hard-coded widths from email templates */
  table, td, th { max-width: 100% !important; word-break: break-word; }
  [width]        { width: auto !important; max-width: 100% !important; }
  pre, code      { white-space: pre-wrap; word-break: break-all; }
</style>
</head><body>${html}</body></html>`;

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="Email content"
      className="w-full border-0 block"
      style={{ height: 0 }}
      onLoad={(e) => {
        const iframe = e.target as HTMLIFrameElement;
        fit(iframe);
        setTimeout(() => fit(iframe), 400);
        setTimeout(() => fit(iframe), 1200);
      }}
    />
  );
}

// ─── Individual email card ─────────────────────────────────────────────────────
function EmailCard({ email, defaultOpen }: { email: FullEmail; defaultOpen: boolean }) {
  const date    = format(new Date(email.receivedAt), "MMM d, h:mm a");
  const toNames = email.to.map((r) => r.name || r.email).join(", ");
  const labels  = email.labels ?? [];

  return (
    <details
      open={defaultOpen}
      className="group/card rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#1c1c1f] overflow-hidden open:shadow-sm dark:open:shadow-black/30 transition-shadow duration-200"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
        <Avatar name={email.from.name} email={email.from.email} size={8} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-snug">
              {email.from.name || email.from.email}
            </p>
          
          </div>
          <p className="text-[11.5px] text-gray-400 dark:text-white/30 truncate leading-snug mt-px">
            To: {toNames}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11.5px] text-gray-400 dark:text-white/30 tabular-nums whitespace-nowrap">
            {date}
          </span>
          <IconChevronDown
            size={13}
            strokeWidth={2.5}
            className="text-gray-300 dark:text-white/20 transition-transform duration-200 group-open/card:rotate-180"
          />
        </div>
      </summary>

      <div className="border-t border-black/5 dark:border-white/5">
        {email.bodyHtml ? (
          <IframeBody html={email.bodyHtml} />
        ) : (
          <p className="px-4 py-4 text-[13.5px] text-gray-600 dark:text-white/55 leading-relaxed whitespace-pre-wrap">
            {email.bodyText ?? email.snippet}
          </p>
        )}

        <div className="flex items-center gap-2 px-4 pb-4 pt-1">
          {([
            { label: "Reply",   Icon: IconArrowBackUp },
            { label: "Forward", Icon: IconArrowForwardUp },
          ] as const).map(({ label, Icon }) => (
            <button
              key={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium",
                "border border-black/9 dark:border-white/10",
                "text-gray-600 dark:text-white/50",
                "hover:bg-black/4 dark:hover:bg-white/6 hover:text-gray-800 dark:hover:text-white/80",
                "transition-colors duration-100",
              )}
            >
              <Icon size={13} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

// ─── AI summary bar ───────────────────────────────────────────────────────────
function AISummaryBar({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);

  if (isLoading) {
    return (
      <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 bg-violet-50/80 dark:bg-violet-950/20 border-b border-violet-100/80 dark:border-violet-900/30">
        <IconSparkles size={12} className="text-violet-400 shrink-0 animate-pulse" />
        <Skeleton className="h-2.5 flex-1 max-w-sm rounded-full" />
      </div>
    );
  }

  if (!data?.summary?.text) return null;

  const { text, sentiment, priority } = data.summary as {
    text: string;
    sentiment: string;
    priority: "high" | "medium" | "low";
  };

  const priorityColor: Record<string, string> = {
    high:   "bg-red-400",
    medium: "bg-amber-400",
    low:    "bg-emerald-400",
  };

  return (
    <div className="shrink-0 flex items-start gap-2.5 px-5 py-2.5 bg-violet-50/60 dark:bg-violet-950/15 border-b border-violet-100/60 dark:border-violet-900/25">
      <IconSparkles size={12} className="text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-[12px] text-gray-600 dark:text-white/50 leading-relaxed">{text}</p>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <span className="text-[10px] text-gray-400 dark:text-white/25 capitalize">{sentiment}</span>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityColor[priority] ?? "bg-gray-300")} />
      </div>
    </div>
  );
}

// ─── Overlay content ──────────────────────────────────────────────────────────
function OverlayContent({ threadId }: { threadId: string }) {
  const { data }       = useThreadDetail(threadId);
  const setActive      = useUIStore((s) => s.setActiveThread);
  const selectedEmail  = useUIStore((s) => s.selectedEmailAddress);
  const threadIds      = useUIStore((s) => s.threadIds);

  const { mutate: toggleStar }    = useToggleStar();
  const { mutate: toggleRead }    = useToggleRead();
  const { mutate: archiveThread } = useArchiveThread();
  const { mutate: deleteThread }  = useDeleteThread();

  if (!data?.success || !data.data.emails.length) return null;

  const emails       = data.data.emails;
  const firstEmail   = emails[0];
  const emailAddress = selectedEmail ?? firstEmail.emailAddress;
  const isStarred    = firstEmail.isStarred;
  const isUnread     = !firstEmail.isRead;
  const actionVars   = { threadId, emailAddress };

  // Deduplicate labels across all emails in thread
  const labelMap = new Map<string, EmailLabel>();
  for (const email of emails) {
    for (const l of email.labels ?? []) {
      labelMap.set(l.id, l);
    }
  }
  const allLabels = Array.from(labelMap.values());

  const currentIdx = threadIds.indexOf(threadId);
  const hasPrev    = currentIdx > 0;
  const hasNext    = currentIdx < threadIds.length - 1;
  const goTo       = (idx: number) => {
    const id = threadIds[idx];
    if (id) setActive(id);
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-black/6 dark:border-white/6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold text-gray-900 dark:text-white leading-snug tracking-[-0.01em]">
            {firstEmail.subject || "(no subject)"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-gray-400 dark:text-white/30 tabular-nums">
              {emails.length} {emails.length === 1 ? "message" : "messages"}
            </span>
            {allLabels.length > 0 && (
              <div className="flex items-center gap-1">
             
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <ToolBtn
            label={isStarred ? "Unstar" : "Star"}
            onClick={() => toggleStar({ ...actionVars, isStarred })}
            active={isStarred}
            activeClass="text-amber-400"
          >
            {isStarred
              ? <IconStarFilled size={15} />
              : <IconStar size={15} strokeWidth={1.8} />}
          </ToolBtn>

          <ToolBtn
            label={isUnread ? "Mark read" : "Mark unread"}
            onClick={() => toggleRead({ ...actionVars, isUnread })}
            active={isUnread}
            activeClass="text-blue-500"
          >
            {isUnread
              ? <IconCircleFilled size={13} />
              : <IconCircle size={13} strokeWidth={1.8} />}
          </ToolBtn>

          <ToolBtn
            label="Archive (e)"
            onClick={() => { archiveThread(actionVars); setActive(null); }}
          >
            <IconArchive size={15} strokeWidth={1.8} />
          </ToolBtn>

          <ToolBtn
            label="Delete (#)"
            onClick={() => { deleteThread(actionVars); setActive(null); }}
            className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <IconTrash size={15} strokeWidth={1.8} />
          </ToolBtn>

          <Divider />

          <ToolBtn label="Previous (k)" onClick={() => goTo(currentIdx - 1)} disabled={!hasPrev}>
            <IconChevronUp size={15} strokeWidth={2.2} />
          </ToolBtn>
          <ToolBtn label="Next (j)" onClick={() => goTo(currentIdx + 1)} disabled={!hasNext}>
            <IconChevronDown size={15} strokeWidth={2.2} />
          </ToolBtn>

          <Divider />

          <ToolBtn label="Close (Esc)" onClick={() => setActive(null)}>
            <IconX size={15} strokeWidth={2.2} />
          </ToolBtn>
        </div>
      </div>

      {/* AI summary */}
      <AISummaryBar threadId={threadId} emailAddress={emailAddress} />

      {/* Email cards */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-2.5">
        {emails.map((email, i) => (
          <EmailCard
            key={email.id}
            email={email}
            defaultOpen={i === emails.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OverlaySkeleton() {
  return (
    <div className="px-5 py-5 space-y-5 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-56 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-7 h-7 rounded-lg" />
          ))}
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/3 rounded" />
              <Skeleton className="h-2.5 w-1/2 rounded" />
            </div>
            <Skeleton className="h-2.5 w-20 rounded shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Guard + portal ───────────────────────────────────────────────────────────
export function EmailOverlay() {
  const layoutMode     = useUIStore((s) => s.layoutMode);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const setActive      = useUIStore((s) => s.setActiveThread);

  const isOpen =
    !!activeThreadId &&
    (layoutMode === "velocity" || layoutMode === "zen");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setActive]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !activeThreadId || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4">
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/55 backdrop-blur-[3px]"
        onClick={() => setActive(null)}
      />
      <div
        className={cn(
          "relative z-10 w-full sm:w-175 lg:w-200",
          "max-h-[90vh] flex flex-col",
          "rounded-2xl overflow-hidden",
          "bg-white dark:bg-[#18181b]",
          "shadow-[0_32px_80px_-8px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_32px_80px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Suspense fallback={<OverlaySkeleton />}>
          <OverlayContent threadId={activeThreadId} />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}