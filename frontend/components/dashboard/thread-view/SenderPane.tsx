"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import {
  IconSparkles,
  IconMail,
  IconNotes,
  IconCopy,
  IconCheck,
  IconBolt,
  IconChevronDown,
  IconTag,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { useUIStore } from "@/lib/store/ui.store";
import { useThreadDetail } from "@/features/mailbox/mailbox.query";
import { useThreadSummary } from "@/features/ai/ai.query";
import { useThreadNote, useUpsertThreadNote } from "@/features/mailbox/mailbox.query";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/ClientOnly";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const HIDDEN_LABELS = new Set(["INBOX", "UNREAD", "SENT", "DRAFT", "TRASH", "SPAM"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
// UPDATED: avatarHue kept but used at 25% saturation everywhere (was 50%)
const avatarHue = (s: string) =>
  s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

// REMOVED: labelHue() — replaced by fixed LABEL_COLORS palette below

function initials(name?: string, email?: string): string {
  const src = name?.trim() || email?.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

function firstName(name?: string, email?: string): string {
  const src = name?.trim();
  if (src) return src.split(/\s+/)[0];
  return email?.split("@")[0] ?? "?";
}

function normalizeLabel(label: string): string {
  return label
    .replace(/^category_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function visibleLabels(labels: string[]): string[] {
  return labels.filter((l) => !HIDDEN_LABELS.has(l.toUpperCase()));
}

// ─── Fixed label color palette ────────────────────────────────────────────────
// UPDATED: replaces random labelHue() — consistent, semantic, Notion-style
const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  CATEGORY_PERSONAL:   { bg: "rgba(99,102,241,0.08)",  text: "#4f46e5" },
  CATEGORY_PROMOTIONS: { bg: "rgba(120,113,108,0.09)", text: "#78716c" },
  CATEGORY_UPDATES:    { bg: "rgba(100,116,139,0.08)", text: "#475569" },
  CATEGORY_SOCIAL:     { bg: "rgba(16,185,129,0.08)",  text: "#059669" },
  CATEGORY_FORUMS:     { bg: "rgba(139,92,246,0.08)",  text: "#7c3aed" },
  IMPORTANT:           { bg: "rgba(217,119,6,0.08)",   text: "#b45309" },
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-300 dark:text-white/20">{icon}</span>
      <span className="text-[9.5px] font-bold tracking-[0.12em] uppercase text-gray-300 dark:text-white/20 select-none">
        {label}
      </span>
    </div>
  );
}

// ─── Account pill ─────────────────────────────────────────────────────────────
function AccountPill({ emailAddress }: { emailAddress: string }) {
  const [copied, setCopied] = useState(false);
  const hue = avatarHue(emailAddress);

  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [emailAddress]);

  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] w-fit max-w-full">
      <span
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
        // UPDATED: 25% saturation (was 50%)
        style={{ background: `hsl(${hue} 25% 52%)` }}
      >
        {emailAddress[0]?.toUpperCase()}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-white/35 truncate">
        {emailAddress}
      </span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50"
      >
        {copied
          ? <IconCheck size={10} className="text-emerald-500" />
          : <IconCopy size={10} />
        }
      </button>
    </div>
  );
}

// ─── Participant pill ─────────────────────────────────────────────────────────
function ParticipantPill({ name, email }: { name?: string; email: string }) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const hue = avatarHue(email);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [email]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 pl-0.5 pr-3.5 py-0.5 rounded-full",
          "border transition-all duration-100 select-none",
          "text-[12px] font-medium",
          open
            ? "bg-black/[0.07] dark:bg-white/[0.1] border-black/[0.1] dark:border-white/[0.15] text-gray-800 dark:text-white/80"
            : "bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-white/55 hover:bg-black/[0.06] dark:hover:bg-white/[0.09]",
        )}
      >
        {/* UPDATED: avatar at 25% saturation */}
        <span
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: `hsl(${hue} 25% 50%)` }}
        >
          {initials(name, email)}
        </span>
        {firstName(name, email)}
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 mt-1.5 z-50",
          "flex items-center gap-2 px-2.5 py-1.5 rounded-xl",
          "bg-white dark:bg-[#1c1c1e]",
          "shadow-[0_4px_20px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]",
          "whitespace-nowrap",
        )}>
          <span className="text-[11.5px] text-gray-600 dark:text-white/55">{email}</span>
          <button
            onClick={copy}
            className="text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
          >
            {copied
              ? <IconCheck size={12} className="text-emerald-500" />
              : <IconCopy size={12} />
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Label pill ───────────────────────────────────────────────────────────────
// UPDATED: uses fixed LABEL_COLORS palette instead of random hue per label
function LabelPill({ label }: { label: string }) {
  const name = normalizeLabel(label);
  const colors = LABEL_COLORS[label.toUpperCase()] ?? { bg: "rgba(0,0,0,0.06)", text: "#71717a" };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium select-none"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <IconTag size={9} strokeWidth={2.5} />
      {name}
    </span>
  );
}

// ─── Summary (collapsible) ────────────────────────────────────────────────────
// UPDATED: removed amber action card — uses neutral surface to match overall tone
function Summary({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const s = data?.summary;

  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!s?.text) return;
    navigator.clipboard
      .writeText([s.text, s.keyPoints, s.actionItems].filter(Boolean).join("\n\n"))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [s]);

  const hasKeyPoints = !!s?.keyPoints && String(s.keyPoints).trim().length > 0;
  const hasAction    = !!s?.actionItems && String(s.actionItems).trim().length > 0;

  return (
    <div className="border-b border-black/[0.05] dark:border-white/[0.05]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors duration-75"
      >
        <SectionHeader icon={<IconSparkles size={10} strokeWidth={2} />} label="Summary" />
        <div className="flex items-center gap-1 shrink-0">
          {expanded && s?.text && !isLoading && (
            <span
              role="button"
              onClick={copy}
              className="p-1 rounded text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
            >
              {copied
                ? <IconCheck size={11} strokeWidth={2} className="text-emerald-500" />
                : <IconCopy size={11} strokeWidth={2} />
              }
            </span>
          )}
          <IconChevronDown
            size={13} strokeWidth={2}
            className={cn(
              "text-gray-300 dark:text-white/20 transition-transform duration-150",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {!expanded && (
        <div className="px-5 pb-3 -mt-0.5">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-full rounded" />
              <Skeleton className="h-2.5 w-3/4 rounded" />
            </div>
          ) : s?.text ? (
            <p className="text-[12px] text-gray-500 dark:text-white/40 leading-relaxed line-clamp-2 tracking-[-0.005em]">
              {s.text}
            </p>
          ) : (
            <p className="text-[12px] text-gray-300 dark:text-white/20 italic">No summary yet</p>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-full rounded" />
              <Skeleton className="h-2.5 w-4/5 rounded" />
              <Skeleton className="h-2.5 w-3/5 rounded" />
            </div>
          ) : s?.text ? (
            <>
              <p className="text-[12px] text-gray-600 dark:text-white/55 leading-relaxed tracking-[-0.005em]">
                {s.text}
              </p>
              {hasKeyPoints && (
                <div className="space-y-1.5">
                  <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-gray-300 dark:text-white/20 select-none">
                    Key Highlights
                  </p>
                  <ul className="space-y-1.5">
                    {String(s.keyPoints).split("\n").filter(Boolean).map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px] text-gray-500 dark:text-white/40 leading-snug">
                        <span className="mt-[5px] w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20 shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasAction && (
                // UPDATED: neutral action card (was amber) — monochrome = premium
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="p-1 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] shrink-0">
                    <IconBolt size={12} className="text-gray-500 dark:text-white/40" />
                  </div>
                  <div>
                    <p className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-gray-300 dark:text-white/25 mb-0.5">
                      Action
                    </p>
                    <p className="text-[11.5px] text-gray-600 dark:text-white/55 leading-snug">
                      {String(s.actionItems)}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[12px] text-gray-300 dark:text-white/20 italic">No summary available</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function Notes({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  return (
    <Suspense fallback={
      <div className="px-5 py-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Skeleton className="h-2 w-2 rounded" />
          <Skeleton className="h-2 w-10 rounded" />
        </div>
        <Skeleton className="h-[76px] w-full rounded-xl" />
      </div>
    }>
      <NotesFetcher threadId={threadId} emailAddress={emailAddress} />
    </Suspense>
  );
}


// Drop-in replacements for NotesFetcher + NotesEditor in SenderPane.tsx
//
// Secondary bug fixed: NotesEditor used useState(initialValue) which only
// reads initialValue once on mount. If the cache updated (e.g. from the
// old invalidateQueries race), the prop would change but the textarea wouldn't.
// Fixed by tracking whether we've ever initialized with a useRef guard so
// the textarea never gets stomped after the user has started typing.

function NotesFetcher({
  threadId,
  emailAddress,
}: {
  threadId:     string;
  emailAddress: string;
}) {
  const { data } = useThreadNote(threadId);

  return (
    <NotesEditor
      key={threadId}              // remount cleanly on thread switch
      threadId={threadId}
      initialValue={data?.notes ?? ""}
      emailAddress={emailAddress}
    />
  );
}

function NotesEditor({
  threadId,
  initialValue,
  emailAddress,
}: {
  threadId:     string;
  initialValue: string;
  emailAddress: string;
}) {
  const { mutate }          = useUpsertThreadNote();
  const [value, setValue]   = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Guard: only accept an external initialValue update if the user hasn't
  // typed anything yet. Once they've typed, their local state is the source
  // of truth — the cache writing back should never overwrite it.
  const hasTyped = useRef(false);

  useEffect(() => {
    if (!hasTyped.current) {
      // Still in read-only / just-loaded state — safe to sync from cache
      setValue(initialValue);
    }
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      hasTyped.current = true;
      setValue(val);
      setStatus("saving");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        mutate(
          { threadId, content: val, emailAddress },
          {
            onSuccess: () => {
              setStatus("saved");
              setTimeout(() => setStatus("idle"), 1500);
            },
            onError: () => setStatus("idle"),
          },
        );
      }, 600);
    },
    [threadId, emailAddress, mutate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isModifier = e.metaKey || e.ctrlKey;
      if (
        isModifier &&
        !["z", "a", "c", "v", "x", "b", "i", "u"].includes(e.key.toLowerCase())
      ) {
        e.currentTarget.blur();
      }
    },
    [],
  );

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-2.5">
        <SectionHeader
          icon={<IconNotes size={10} strokeWidth={2} />}
          label="Notes"
        />
        <span
          className={cn(
            "text-[10px] transition-opacity duration-300",
            status === "idle" ? "opacity-0" : "opacity-100",
            status === "saving"
              ? "text-gray-300 dark:text-white/25"
              : "text-emerald-500",
          )}
        >
          {status === "saving" ? "saving…" : "saved ✓"}
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Write a note about this thread…"
        rows={3}
        className={cn(
          "w-full resize-none rounded-xl px-3.5 py-3",
          "text-[12px] leading-relaxed min-h-[76px]",
          "bg-gray-50 dark:bg-white/[0.03]",
          "border border-gray-100 dark:border-white/[0.06]",
          "text-gray-700 dark:text-white/70",
          "placeholder:text-gray-300 dark:placeholder:text-white/20",
          "focus:outline-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-white/10",
          "transition-colors duration-150 overflow-hidden",
        )}
      />
    </div>
  );
}
// ─── Pane content ─────────────────────────────────────────────────────────────
function PaneContent({
  threadId,
  className,
}: {
  threadId:       string;
  activeThreadId: string | null;
  className?:     string;
}) {
  const { data: threadData } = useThreadDetail(threadId);
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  const emails      = threadData?.data?.emails ?? [];
  const first       = emails[0];
  const senderEmail = first?.from?.email ?? "";
  const senderName  = first?.from?.name ?? senderEmail;
  const hue         = avatarHue(senderEmail);
  const emailAddr   = selectedEmail ?? first?.emailAddress ?? senderEmail;

  const firstDate = first ? format(new Date(first.receivedAt), "MMM d") : null;
  const lastDate  = emails.length > 1
    ? format(new Date(emails[emails.length - 1].receivedAt), "MMM d")
    : null;
  const dateStr = lastDate && lastDate !== firstDate
    ? `${firstDate} – ${lastDate}`
    : firstDate;

  const seen = new Set<string>();
  const participants: { name?: string; email: string }[] = [];
  for (const e of emails) {
    if (!seen.has(e.from.email)) {
      seen.add(e.from.email);
      participants.push({ name: e.from.name, email: e.from.email });
    }
  }

  const labels = visibleLabels(first?.labels ?? []);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-950", className)}>

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 shrink-0 space-y-3">

        {/* Avatar + name + email */}
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0 select-none tracking-[0.02em]"
            // UPDATED: 25% saturation (was 50%) — muted, Notion-style
            style={{ background: `hsl(${hue} 25% 52%)` }}
          >
            {initials(senderName, senderEmail)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white truncate tracking-[-0.015em] leading-tight">
              {senderName}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-white/35 truncate mt-0.5">
              {senderEmail}
            </p>
          </div>
        </div>

        {/* Date · count */}
        {dateStr && (
          <p className="text-[11px] text-gray-300 dark:text-white/22 tabular-nums">
            {dateStr}
            <span className="mx-1.5 opacity-60">·</span>
            {emails.length} {emails.length === 1 ? "message" : "messages"}
          </p>
        )}

        {/* Labels — UPDATED: fixed semantic colors via LabelPill */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.map((l) => <LabelPill key={l} label={l} />)}
          </div>
        )}

        {/* Account pill */}
        {emailAddr && <AccountPill emailAddress={emailAddr} />}

        {/* Participant pills */}
        {participants.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {participants.map((p) => (
              <ParticipantPill key={p.email} name={p.name} email={p.email} />
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 border-t border-black/[0.05] dark:border-white/[0.05]">
        <Summary threadId={threadId} emailAddress={emailAddr} />
        <Notes threadId={threadId} emailAddress={emailAddr} />
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function SenderPane({ className }: { className?: string }) {
  const layoutMode      = useUIStore((s) => s.layoutMode);
  const activeThreadId  = useUIStore((s) => s.activeThreadId);
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

// ─── Empty ────────────────────────────────────────────────────────────────────
function Empty({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
      <IconMail size={22} strokeWidth={1.2} className="text-gray-200 dark:text-white/10" />
      <p className="text-[12px] text-gray-300 dark:text-white/20">Hover a thread to preview</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PaneSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full p-5 gap-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-1/3 rounded" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
      <Skeleton className="h-7 w-48 rounded-lg" />
      <div className="flex gap-1.5">
        <Skeleton className="h-[30px] w-[72px] rounded-full" />
        <Skeleton className="h-[30px] w-[64px] rounded-full" />
        <Skeleton className="h-[30px] w-[80px] rounded-full" />
      </div>
      <div className="space-y-1.5 pt-1">
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