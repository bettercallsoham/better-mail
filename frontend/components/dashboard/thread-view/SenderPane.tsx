"use client";

import { Suspense, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  IconSparkles,
  IconMail,
  IconNotes,
  IconClock,
  IconCopy,
  IconTag,
  IconCheck,
  IconChevronDown,
  IconBolt,
} from "@tabler/icons-react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail,
  useThreadsBySender,
} from "@/features/mailbox/mailbox.query";
import { useThreadSummary } from "@/features/ai/ai.query";
import type {
  ThreadEmail,
  EmailLabel,
  FullEmail,
} from "@/features/mailbox/mailbox.type";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/ClientOnly";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const SYSTEM_LABELS = new Set([
  "inbox",
  "sent",
  "starred",
  "important",
  "draft",
  "drafts",
  "unread",
  "archived",
  "spam",
  "trash",
  "all",
  "category_promotions",
  "category_social",
  "category_updates",
  "category_forums",
  "category_primary",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const labelHue = (l: string) =>
  l.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const fmtLabel = (l: string) =>
  l.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const avatarHue = (s: string) =>
  s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

function initials(name?: string, email?: string): string {
  const src = name?.trim() || email?.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return (
    parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
  ).toUpperCase();
}

// ── Fix: EmailLabel is { id, name, color? } not a string ──
function extractLabels(emails: FullEmail[]): string[] {
  return [
    ...new Set(
      emails
        .flatMap((e) => e.labels ?? [])
        .map((l: EmailLabel | string) => (typeof l === "string" ? l : l.name))
        .map((l) => l.toLowerCase().trim())
        .filter((l) => l && !SYSTEM_LABELS.has(l)),
    ),
  ];
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-gray-300 dark:text-white/20">{icon}</span>
      <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-gray-300 dark:text-white/20 select-none">
        {label}
      </span>
    </div>
  );
}

// ─── Guard ────────────────────────────────────────────────────────────────────
export function SenderPane({ className }: { className?: string }) {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const activeThreadId = useUIStore((s) => s.activeThreadId);
  const focusedThreadId = useUIStore((s) => s.focusedThreadId);

  const previewId =
    layoutMode === "velocity"
      ? (focusedThreadId ?? activeThreadId)
      : activeThreadId;

  if (!previewId) return <Empty className={className} />;

  return (
    <ClientOnly fallback={<PaneSkeleton className={className} />}>
      <Suspense fallback={<PaneSkeleton className={className} />}>
        <PaneContent
          threadId={previewId}
          activeThreadId={activeThreadId}
          className={className}
        />
      </Suspense>
    </ClientOnly>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function PaneContent({
  threadId,
  activeThreadId,
  className,
}: {
  threadId: string;
  activeThreadId: string | null;
  className?: string;
}) {
  const { data: threadData } = useThreadDetail(threadId);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);
  const setActiveThread = useUIStore((s) => s.setActiveThread);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);

  const emails = threadData?.data?.emails ?? [];
  const first = emails[0];
  const senderEmail = first?.from?.email ?? "";
  const senderName = first?.from?.name ?? senderEmail;
  const hue = avatarHue(senderEmail);
  const emailAddr = selectedEmail ?? first?.emailAddress ?? senderEmail;
  const labels = extractLabels(emails);

  const { data: senderThreads = [], isLoading: loadingThreads } =
    useThreadsBySender(senderEmail);

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-950",
        className,
      )}
    >
      {/* ── Profile ── */}
      <div className="px-5 pt-5 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0 select-none shadow-sm"
            style={{ background: `hsl(${hue} 50% 46%)` }}
          >
            {initials(senderName, senderEmail)}
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate tracking-[-0.015em] leading-tight">
              {senderName}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-white/35 truncate mt-0.5">
              {senderEmail}
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 border-t border-black/5 dark:border-white/5">
        <Summary threadId={threadId} emailAddress={emailAddr} />
        <Notes senderEmail={senderEmail} />
        {labels.length > 0 && (
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => {
                const hue = labelHue(l);
                return (
                  <button
                    key={l}
                    onClick={() => setActiveFolder(l)}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 hover:opacity-90"
                    style={{
                      backgroundColor: `hsl(${hue} 50% 44% / 0.1)`,
                      color: `hsl(${hue} 45% 38%)`,
                      borderLeft: `2px solid hsl(${hue} 50% 44%)`,
                    }}
                  >
                    <IconTag
                      size={10}
                      strokeWidth={2}
                      style={{ color: `hsl(${hue} 50% 44%)` }}
                    />
                    {fmtLabel(l)}
                  </button>
                );
              })}
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-gray-300 dark:text-white/20 border border-dashed border-gray-200 dark:border-white/10 hover:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 transition-colors">
                <span className="text-[10px]">+</span>
                Add New
              </button>
            </div>
          </div>
        )}
        {/* <EmailHistory
          threads={senderThreads}
          activeThreadId={activeThreadId}
          isLoading={loadingThreads}
          onSelect={setActiveThread}
        /> */}
      </div>
    </div>
  );
}

function Summary({
  threadId,
  emailAddress,
}: {
  threadId: string;
  emailAddress: string;
}) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);
  const [copied, setCopied] = useState(false);
  const s = data?.summary;

  const copy = useCallback(() => {
    if (!s?.text) return;
    const txt = [s.text, s.keyPoints, s.actionItems]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(String(txt)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [s]);

  return (
    <div className="px-5 py-4 border-b border-black/5 dark:border-white/5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <SectionHeader
          icon={<IconSparkles size={10} strokeWidth={2} />}
          label="Summary"
        />
        {s?.text && (
          <button
            onClick={copy}
            className="p-1 rounded text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
          >
            {copied ? (
              <IconCheck
                size={11}
                strokeWidth={2}
                className="text-emerald-500"
              />
            ) : (
              <IconCopy size={11} strokeWidth={2} />
            )}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-full rounded" />
          <Skeleton className="h-2.5 w-4/5 rounded" />
          <Skeleton className="h-2.5 w-3/5 rounded" />
        </div>
      ) : s?.text ? (
        <div className="space-y-3">
          {/* Body text */}
          <p className="text-[12px] text-gray-600 dark:text-white/55 leading-relaxed">
            {s.text}
          </p>

          {/* Key points */}
          {s.keyPoints && (
            <>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
                Key Highlights
              </h4>
              <ul className="space-y-1.5">
                {String(s.keyPoints)
                  .split("\n")
                  .filter(Boolean)
                  .map((pt, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[11.5px] text-gray-500 dark:text-white/40 leading-snug"
                    >
                      <span className="mt-[5px] w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20 shrink-0" />
                      {pt}
                    </li>
                  ))}
              </ul>
            </>
          )}

          {/* Action items — card style */}
          {s.actionItems && (
            <div className="relative overflow-hidden p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 bg-linear-to-br from-amber-50/50 to-white dark:from-amber-500/5 dark:to-transparent">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 shrink-0">
                  <IconBolt
                    size={14}
                    className="text-amber-600 dark:text-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <p className=" text-[10px]  tracking-tight  text-amber-700/70 dark:text-amber-400/70">
                    Recommended Action
                  </p>
                  <p className=" text-xs text-amber-900 dark:text-amber-200/90  font-normal">
                    {String(s.actionItems)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-gray-300 dark:text-white/20 italic">
          No summary available
        </p>
      )}
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function Notes({ senderEmail }: { senderEmail: string }) {
  const storageKey = `note:${senderEmail}`;
  const [note, setNote] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  });
  const [saved, setSaved] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNote(val);
      try {
        localStorage.setItem(storageKey, val);
      } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
    [storageKey],
  );

  return (
    <div className="px-5 py-4 border-b border-black/[0.05] dark:border-white/[0.05]">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon={<IconNotes size={10} strokeWidth={2} />}
          label="Notes"
        />
        {saved && (
          <span className="text-[10px] text-emerald-500 -mt-2">saved</span>
        )}
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        placeholder="Press N to start writing a note…"
        rows={3}
        className={cn(
          "w-full resize-none rounded-xl px-3.5 py-3 text-[12px] leading-relaxed",
          "bg-gray-50 dark:bg-white/[0.03]",
          "border border-gray-100 dark:border-white/[0.06]",
          "text-gray-700 dark:text-white/70",
          "placeholder:text-gray-300 dark:placeholder:text-white/20",
          "focus:outline-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-white/10",
          "transition-colors duration-150",
        )}
      />
    </div>
  );
}



// ─── Empty ────────────────────────────────────────────────────────────────────
function Empty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full gap-2",
        className,
      )}
    >
      <IconMail
        size={22}
        strokeWidth={1.2}
        className="text-gray-200 dark:text-white/10"
      />
      <p className="text-[12px] text-gray-300 dark:text-white/20">
        Hover a thread to preview
      </p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PaneSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full p-5 gap-5", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
          <Skeleton className="h-2.5 w-1/3 rounded" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-full rounded" />
        <Skeleton className="h-2.5 w-4/5 rounded" />
        <Skeleton className="h-2.5 w-3/5 rounded" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-2 w-10 rounded" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
