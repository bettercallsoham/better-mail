"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  IconSparkles,
  IconMail,
  IconNotes,
  IconClock,
} from "@tabler/icons-react";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail,
  useThreadsBySender,
} from "@/features/mailbox/mailbox.query";
import { useThreadSummary } from "@/features/ai/ai.query";
import type { ThreadEmail, EmailLabel } from "@/features/mailbox/mailbox.type";
import { Skeleton } from "@/components/ui/skeleton";
import { LabelChip } from "@/components/dashboard/thread-view/LabelChip";
import { ClientOnly } from "@/components/ClientOnly";
import { cn } from "@/lib/utils";

// ─── Guard ────────────────────────────────────────────────────────────────────
export function SenderPane({ className }: { className?: string }) {
  const layoutMode      = useUIStore((s) => s.layoutMode);
  const activeThreadId  = useUIStore((s) => s.activeThreadId);
  const focusedThreadId = useUIStore((s) => s.focusedThreadId);

  // Velocity: sender pane previews the hovered/focused row (not necessarily opened)
  const previewThreadId =
    layoutMode === "velocity"
      ? (focusedThreadId ?? activeThreadId)
      : activeThreadId;

  if (!previewThreadId) {
    return <SenderPaneEmpty className={className} />;
  }

  return (
    <ClientOnly fallback={<SenderPaneSkeleton className={className} />}>
      <Suspense fallback={<SenderPaneSkeleton className={className} />}>
        <SenderPaneContent
          threadId={previewThreadId}
          activeThreadId={activeThreadId}
          className={className}
        />
      </Suspense>
    </ClientOnly>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────
function SenderPaneContent({
  threadId,
  activeThreadId,
  className,
}: {
  threadId: string;
  activeThreadId: string | null;
  className?: string;
}) {
  const { data: threadData } = useThreadDetail(threadId);
  const selectedEmail        = useUIStore((s) => s.selectedEmailAddress);
  const setActiveThread      = useUIStore((s) => s.setActiveThread);

  const firstEmail  = threadData?.data?.emails?.[0];
  const senderEmail = firstEmail?.from?.email ?? "";
  const senderName  = firstEmail?.from?.name  ?? senderEmail;
  const hue         = senderEmail.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials    = senderName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

  const emailAddress = selectedEmail ?? firstEmail?.emailAddress ?? senderEmail;

  // Deduplicate labels across all emails in thread
  const labelMap = new Map<string, EmailLabel>();
  for (const email of threadData?.data?.emails ?? []) {
    for (const l of email.labels ?? []) {
      if (l?.id) labelMap.set(l.id, l);
    }
  }
  const threadLabels = Array.from(labelMap.values());

  const { data: senderThreads = [], isLoading: loadingThreads } =
    useThreadsBySender(senderEmail);

  const subject = firstEmail?.subject ?? "";

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-950", className)}>

      {/* ── 1. Sender profile ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3.5 border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0 select-none shadow-sm"
            style={{ background: `hsl(${hue} 52% 46%)` }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-tight tracking-[-0.01em]">
              {senderName}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-white/35 truncate mt-0.5">
              {senderEmail}
            </p>
          </div>
        </div>

        {subject && (
          <p className="mt-2.5 text-[12px] text-gray-600 dark:text-white/50 leading-snug line-clamp-2 tracking-[-0.005em]">
            {subject}
          </p>
        )}

        {threadLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {threadLabels.map((l) => (
              <LabelChip key={l.id} label={l} variant="badge" />
            ))}
          </div>
        )}

        <p className="mt-2 text-[11px] text-gray-400 dark:text-white/25 tabular-nums">
          {loadingThreads
            ? "Loading…"
            : `${senderThreads.length} thread${senderThreads.length !== 1 ? "s" : ""} with this sender`}
        </p>
      </div>

      {/* ── 2. AI Summary ── */}
      <AISummarySection threadId={threadId} emailAddress={emailAddress} />

      {/* ── 3. Notes ── */}
      <NotesSection senderEmail={senderEmail} />

      {/* ── 4. Email history ── */}
      <EmailHistory
        threads={senderThreads}
        activeThreadId={activeThreadId}
        isLoading={loadingThreads}
        onSelect={setActiveThread}
      />
    </div>
  );
}

// ─── AI Summary ───────────────────────────────────────────────────────────────
function AISummarySection({
  threadId,
  emailAddress,
}: {
  threadId: string;
  emailAddress: string;
}) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);

  return (
    <div className="flex-shrink-0 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05]">
      <SectionLabel icon={<IconSparkles size={10} strokeWidth={2} />} text="Summary" />

      {isLoading ? (
        <div className="space-y-1.5 mt-2">
          <Skeleton className="h-2.5 w-full rounded" />
          <Skeleton className="h-2.5 w-4/5 rounded" />
        </div>
      ) : data?.summary?.text ? (
        <div className="space-y-2 mt-2">
          <p className="text-[12px] text-gray-600 dark:text-white/55 leading-relaxed">
            {data.summary.text}
          </p>

          {data.summary.keyPoints && (
            <ul className="space-y-0.5">
              {(data.summary.keyPoints as string)
                .split("\n")
                .filter(Boolean)
                .map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-gray-500 dark:text-white/40">
                    <span className="mt-[5px] w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20 flex-shrink-0" />
                    {pt}
                  </li>
                ))}
            </ul>
          )}

          {data.summary.actionItems && (
            <p className="text-[11.5px] text-amber-600 dark:text-amber-400/70 leading-relaxed">
              ⚡ {data.summary.actionItems as string}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <span className={cn(
              "text-[10px] font-medium capitalize",
              data.summary.sentiment === "positive" && "text-emerald-500 dark:text-emerald-400",
              data.summary.sentiment === "negative" && "text-red-500 dark:text-red-400",
              data.summary.sentiment === "neutral"  && "text-gray-400 dark:text-white/25",
            )}>
              {data.summary.sentiment}
            </span>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              data.summary.priority === "high"   && "bg-red-400",
              data.summary.priority === "medium" && "bg-amber-400",
              data.summary.priority === "low"    && "bg-gray-300 dark:bg-white/20",
            )} />
            <span className="text-[10px] text-gray-400 dark:text-white/25 capitalize">
              {data.summary.priority} priority
            </span>
            {data.cached && (
              <span className="ml-auto text-[10px] text-gray-300 dark:text-white/15">cached</span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-gray-300 dark:text-white/20 italic">
          No summary available
        </p>
      )}
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function NotesSection({ senderEmail }: { senderEmail: string }) {
  const storageKey      = `note:${senderEmail}`;
  const [note, setNote]     = useState("");
  const [editing, setEditing] = useState(false);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage only on client (avoids SSR mismatch)
  useEffect(() => {
    try { setNote(localStorage.getItem(storageKey) ?? ""); } catch {}
    setEditing(false);
  }, [storageKey]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function save(val: string) {
    setNote(val);
    try { localStorage.setItem(storageKey, val); } catch {}
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05]">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel icon={<IconNotes size={10} strokeWidth={2} />} text="Notes" />
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 transition-colors"
        >
          {editing ? "done" : "edit"}
        </button>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => save(e.target.value)}
          placeholder="Add a note about this sender…"
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg px-3 py-2 text-[12.5px] leading-relaxed",
            "bg-black/[0.03] dark:bg-white/[0.05]",
            "border border-black/[0.08] dark:border-white/[0.08]",
            "text-gray-700 dark:text-white/70 placeholder:text-gray-300 dark:placeholder:text-white/20",
            "focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-white/20",
          )}
        />
      ) : note ? (
        <p
          onClick={() => setEditing(true)}
          className="text-[12.5px] text-gray-600 dark:text-white/55 leading-relaxed cursor-text whitespace-pre-wrap line-clamp-4"
        >
          {note}
        </p>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-[12px] text-gray-300 dark:text-white/20 hover:text-gray-400 transition-colors italic"
        >
          Add a note…
        </button>
      )}
    </div>
  );
}

// ─── Email history ────────────────────────────────────────────────────────────
function EmailHistory({
  threads,
  activeThreadId,
  isLoading,
  onSelect,
}: {
  threads: ThreadEmail[];
  activeThreadId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      <div className="px-4 py-2.5 flex-shrink-0">
        <SectionLabel icon={<IconClock size={10} strokeWidth={2} />} text="Emails" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="px-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-2.5 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-4 py-3 text-[12px] text-gray-300 dark:text-white/20 text-center italic">
            No threads found
          </p>
        ) : (
          threads.map((t) => {
            const isActive = t.threadId === activeThreadId;
            const labels   = t.labels ?? [];

            return (
              <button
                key={t.threadId}
                onClick={() => onSelect(t.threadId)}
                className={cn(
                  "relative w-full text-left px-4 py-2.5 overflow-hidden",
                  "border-b border-black/[0.04] dark:border-white/[0.04]",
                  "transition-colors duration-75",
                  "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                  isActive && "bg-blue-50/60 dark:bg-white/[0.06]",
                )}
              >
                {isActive && (
                  <span className="absolute inset-y-0 left-0 w-[2px] bg-blue-400 dark:bg-white/40 rounded-r-full" />
                )}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={cn(
                    "truncate text-[12px]",
                    t.isUnread
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "font-normal text-gray-600 dark:text-white/50",
                  )}>
                    {t.subject || "(no subject)"}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-white/25 tabular-nums whitespace-nowrap">
                    {format(new Date(t.receivedAt), "MMM d")}
                  </span>
                </div>

                {t.snippet && (
                  <p className="truncate text-[11.5px] text-gray-400 dark:text-white/28 mb-1">
                    {t.snippet}
                  </p>
                )}

                {labels.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {labels.slice(0, 4).map((l) => (
                      <LabelChip key={l.id} label={l} variant="dot" />
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Shared section label ─────────────────────────────────────────────────────
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400 dark:text-white/25">{icon}</span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 dark:text-white/25 select-none">
        {text}
      </span>
    </div>
  );
}

// ─── Empty / Skeleton ─────────────────────────────────────────────────────────
function SenderPaneEmpty({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
      <IconMail size={24} strokeWidth={1.2} className="text-gray-200 dark:text-white/10" />
      <p className="text-[12px] text-gray-300 dark:text-white/20">Hover a thread to preview</p>
    </div>
  );
}

function SenderPaneSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 pt-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.05] space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
        <Skeleton className="h-2.5 w-full rounded" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-14 rounded-md" />
          <Skeleton className="h-4 w-10 rounded-md" />
        </div>
      </div>
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05] space-y-2">
        <Skeleton className="h-2 w-12 rounded" />
        <Skeleton className="h-2.5 w-full rounded" />
        <Skeleton className="h-2.5 w-4/5 rounded" />
      </div>
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05] space-y-2">
        <Skeleton className="h-2 w-10 rounded" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
      <div className="flex-1 px-4 py-3 space-y-3">
        <Skeleton className="h-2 w-10 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-2.5 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}