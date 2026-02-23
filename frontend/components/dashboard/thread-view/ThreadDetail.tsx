"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { useUIStore } from "@/lib/store/ui.store";
import { useThreadDetail } from "@/features/mailbox/mailbox.query";
import { FullEmail } from "@/features/mailbox/mailbox.type";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Public export — guard ─────────────────────────────────────────────────────
export function ThreadDetail({ className }: { className?: string }) {
  const activeThreadId = useUIStore((s) => s.activeThreadId);

  if (!activeThreadId) return <ThreadDetailEmpty className={className} />;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Suspense fallback={<ThreadDetailSkeleton />}>
        <ThreadDetailContent threadId={activeThreadId} />
      </Suspense>
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────
function ThreadDetailContent({ threadId }: { threadId: string }) {
  const { data } = useThreadDetail(threadId);
  const setActiveThread = useUIStore((s) => s.setActiveThread);

  if (!data.success || !data.data.emails.length) return <ThreadDetailEmpty />;

  const emails = data.data.emails;
  const subject = emails[0].subject;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-black/[0.05] dark:border-white/[0.05] flex-shrink-0">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
            {subject}
          </h2>
          <p className="text-[12px] text-gray-400 dark:text-white/35 mt-0.5">
            {emails.length} {emails.length === 1 ? "message" : "messages"}
          </p>
        </div>

        {/* Close — mobile */}
        <button
          onClick={() => setActiveThread(null)}
          aria-label="Close"
          className="sm:hidden flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] dark:hover:text-white dark:hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
        {emails.map((email, i) => (
          <EmailMessage
            key={email.id}
            email={email}
            defaultOpen={i === emails.length - 1}
          />
        ))}
      </div>
    </>
  );
}

// ── Individual email message ──────────────────────────────────────────────────
function EmailMessage({
  email,
  defaultOpen,
}: {
  email: FullEmail;
  defaultOpen: boolean;
}) {
  const senderInitials = (email.from.name || email.from.email).slice(0, 2).toUpperCase();
  const hue = email.from.email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const formattedDate = format(new Date(email.receivedAt), "MMM d, h:mm a");
  const toNames = email.to.map((r) => r.name || r.email).join(", ");

  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-xl border transition-all duration-150",
        "border-black/[0.07] dark:border-white/[0.08]",
        "open:shadow-sm",
      )}
    >
      {/* Summary / collapsed header */}
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        {/* Avatar */}
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: `hsl(${hue} 52% 48%)` }}
        >
          {senderInitials}
        </span>

        {/* Sender info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
            {email.from.name || email.from.email}
          </p>
          <p className="text-[12px] text-gray-400 dark:text-white/35 truncate">
            To: {toNames}
          </p>
        </div>

        {/* Date */}
        <span className="flex-shrink-0 text-[12px] text-gray-400 dark:text-white/30 tabular-nums">
          {formattedDate}
        </span>

        {/* Chevron */}
        <span className="flex-shrink-0 text-[11px] text-gray-300 dark:text-white/20 ml-1 group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>

      {/* Email body */}
      <div className="px-4 pb-4 pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
        {email.bodyHtml ? (
          <EmailBody html={email.bodyHtml} />
        ) : (
          <p className="text-[13.5px] text-gray-600 dark:text-white/60 leading-relaxed whitespace-pre-wrap">
            {email.snippet}
          </p>
        )}

        {/* Reply / Forward */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
          {[{ label: "Reply", icon: "↩" }, { label: "Forward", icon: "↪" }].map(({ label, icon }) => (
            <button
              key={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium",
                "border border-black/[0.1] dark:border-white/[0.12]",
                "text-gray-600 dark:text-white/55",
                "hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white",
                "transition-colors duration-100",
              )}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}


// ── Email HTML sandbox ────────────────────────────────────────────────────────
// Renders email HTML in an isolated iframe so inline styles from the email
// never bleed into our UI, and our dark mode never breaks email rendering.
// The iframe always renders on a white background (as email authors intended).
function EmailBody({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  // Wrap the raw HTML in a minimal document that:
  // 1. Forces light color-scheme so dark-mode OS settings don't invert colors
  // 2. Resets margin/padding
  // 3. Makes all content width-contained
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #374151;
    background: #ffffff;
    color-scheme: light;
  }
  body { padding: 0 2px; }
  img { max-width: 100%; height: auto; }
  a { color: #3b82f6; }
  /* Prevent emails from breaking out of frame */
  * { max-width: 100% !important; word-break: break-word; }
  table { width: 100% !important; }
</style>
</head>
<body>${html}</body>
</html>`;

  // Resize iframe to match its content height — no scrollbars, no clipping
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function resize() {
      try {
        const body = iframe?.contentDocument?.body;
        if (body) setHeight(body.scrollHeight + 16);
      } catch {
        // Cross-origin or not ready yet — ignore
      }
    }

    iframe.addEventListener("load", resize);
    // Also resize on a short delay for emails with late-loading images
    iframe.addEventListener("load", () => setTimeout(resize, 500));
    return () => iframe.removeEventListener("load", resize);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"  // No scripts, no popups, no forms
      className="w-full border-0 block"
      style={{ height }}
      title="Email content"
    />
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ThreadDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full px-5 py-4 gap-3", className)}>
      <Skeleton className="h-5 w-2/3 rounded" />
      <Skeleton className="h-3 w-1/4 rounded" />
      <div className="mt-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function ThreadDetailEmpty({ className }: { className?: string }) {
  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center gap-2 text-center px-8", className)}>
      <span className="text-3xl opacity-20">✉</span>
      <p className="text-[13px] text-gray-400 dark:text-white/30">
        Select a thread to read
      </p>
    </div>
  );
}