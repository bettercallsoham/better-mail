"use client";

import {
  Suspense, useRef, useState, useCallback, useEffect, memo,
} from "react";
import { format } from "date-fns";
import {
  IconX, IconChevronLeft, IconChevronRight,
  IconStar, IconStarFilled, IconArchive, IconArchiveOff, IconTrash,
  IconSparkles, IconCopy, IconCheck, IconChevronDown,
  IconArrowBackUp, IconArrowForwardUp, IconBolt,
  IconUser, IconTag, IconBell, IconMessages, IconLayoutList, IconAlertTriangle,
  IconNotes, IconMailOpened, IconMail,
} from "@tabler/icons-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUIStore } from "@/lib/store/ui.store";
import {
  useThreadDetail, useEmailAction, useThreadNote, useUpsertThreadNote,
} from "@/features/mailbox/mailbox.query";
import { useThreadSummary } from "@/features/ai/ai.query";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

// ─── Label metadata — dark-mode aware ──────────────────────────────────────────
const LABEL_META: Record<string, { icon: React.ReactNode; bg: string; text: string; darkBg: string; darkText: string; name: string }> = {
  CATEGORY_PERSONAL:   { icon: <IconUser size={12} />,         bg: "rgba(99,102,241,0.08)",  text: "#4f46e5", darkBg: "rgba(99,102,241,0.15)",  darkText: "#818cf8", name: "Personal"   },
  CATEGORY_PROMOTIONS: { icon: <IconTag size={12} />,          bg: "rgba(120,113,108,0.09)", text: "#78716c", darkBg: "rgba(255,255,255,0.07)", darkText: "rgba(255,255,255,0.42)", name: "Promotions" },
  CATEGORY_UPDATES:    { icon: <IconBell size={12} />,         bg: "rgba(100,116,139,0.08)", text: "#475569", darkBg: "rgba(100,116,139,0.15)", darkText: "#94a3b8", name: "Updates"    },
  CATEGORY_SOCIAL:     { icon: <IconMessages size={12} />,     bg: "rgba(16,185,129,0.08)",  text: "#059669", darkBg: "rgba(16,185,129,0.14)",  darkText: "#34d399", name: "Social"     },
  CATEGORY_FORUMS:     { icon: <IconLayoutList size={12} />,   bg: "rgba(139,92,246,0.08)",  text: "#7c3aed", darkBg: "rgba(139,92,246,0.14)",  darkText: "#a78bfa", name: "Forums"     },
  IMPORTANT:           { icon: <IconAlertTriangle size={12} />, bg: "rgba(217,119,6,0.08)",  text: "#b45309", darkBg: "rgba(217,119,6,0.15)",   darkText: "#fbbf24", name: "Important"  },
};
const HIDDEN_LABELS = new Set(["INBOX","UNREAD","SENT","DRAFT","TRASH","SPAM"]);

// ─── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, email, size = 8 }: { name?: string; email: string; size?: number }) {
  const hue     = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const src     = name?.trim() || email;
  const parts   = src.split(/\s+/).filter(Boolean);
  const letters = (parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
  const szCls   = ({ 6:"w-6 h-6 text-[9px]", 7:"w-7 h-7 text-[10px]", 8:"w-8 h-8 text-[11px]", 9:"w-9 h-9 text-[12px]" } as Record<number,string>)[size] ?? "w-8 h-8 text-[11px]";
  return (
    <span
      className={cn("shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none tracking-[0.02em]", szCls)}
      style={{ background: `hsl(${hue} 25% 52%)` }}
    >
      {letters}
    </span>
  );
}

// ─── Participant pill ─────────────────────────────────────────────────────────
function ParticipantPill({ name, email }: { name?: string; email: string }) {
  const [copied, setCopied] = useState(false);
  const displayName = name || email.split("@")[0];
  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }, [email]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors cursor-default">
            <Avatar name={name} email={email} size={6} />
            <span className="text-[11.5px] font-medium text-gray-600 dark:text-white/52 max-w-[90px] truncate">
              {displayName}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2 py-1.5 px-2.5">
          <span className="text-[11px]">{email}</span>
          <button onClick={copy} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
            {copied ? <IconCheck size={12} className="text-emerald-500" /> : <IconCopy size={12} />}
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Label dot ────────────────────────────────────────────────────────────────
function LabelDot({ label }: { label: string }) {
  const meta = LABEL_META[label];
  if (!meta) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="w-[22px] h-[22px] rounded-full flex items-center justify-center cursor-default"
            style={{ backgroundColor: meta.bg, color: meta.text }}
          >
            {meta.icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom"><span className="text-[11px]">{meta.name}</span></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── TipBtn ───────────────────────────────────────────────────────────────────
function TipBtn({ onClick, tip, kbd, className, disabled, active, children }: {
  onClick?: () => void; tip: string; kbd?: string;
  className?: string; disabled?: boolean; active?: boolean; children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick} disabled={disabled}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-100",
              "text-gray-400 dark:text-white/28",
              "hover:text-gray-700 dark:hover:text-white/65 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
              "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              active && "bg-black/[0.05] dark:bg-white/[0.09] text-gray-700 dark:text-white/65",
              className,
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-1.5">
          <span className="text-[11px]">{tip}</span>
          {kbd && <Kbd className="text-[9px] font-mono px-1 py-px rounded">{kbd}</Kbd>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Notes dropdown ───────────────────────────────────────────────────────────
function NotesDropdown({ threadId, emailAddress, onClose }: {
  threadId: string; emailAddress: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full right-0 mt-1.5 z-50 w-80",
        "rounded-2xl overflow-hidden",
        // DARK: #1f1f1f surface — elevated above #191919 base
        "bg-white dark:bg-[#1f1f1f]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <IconNotes size={13} className="text-gray-400 dark:text-white/30" />
          <span className="text-[12px] font-semibold text-gray-600 dark:text-white/48 tracking-tight">Thread Notes</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors">
          <IconX size={12} />
        </button>
      </div>
      <Suspense fallback={<div className="p-4"><Skeleton className="h-[80px] w-full rounded-xl" /></div>}>
        <NotesEditorInner threadId={threadId} emailAddress={emailAddress} />
      </Suspense>
    </div>
  );
}

function NotesEditorInner({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  const { data }            = useThreadNote(threadId);
  const { mutate }          = useUpsertThreadNote();
  const [value, setValue]   = useState(data?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mutate(
        { threadId, content: val, emailAddress },
        { onSuccess: () => { setStatus("saved"); setTimeout(() => setStatus("idle"), 1500); }, onError: () => setStatus("idle") },
      );
    }, 600);
  }, [threadId, emailAddress, mutate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const isModifier = e.metaKey || e.ctrlKey;
    if (isModifier && !["z","a","c","v","x","b","i","u"].includes(e.key.toLowerCase())) e.currentTarget.blur();
  }, []);

  return (
    <div className="p-4">
      <textarea
        ref={textareaRef} value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder="Write a note about this thread…" rows={4}
        className={cn(
          "w-full resize-none rounded-xl px-3.5 py-3",
          "text-[12.5px] leading-relaxed min-h-[96px]",
          // DARK: #272727 — slightly above surface, clearly a text field
          "bg-gray-50 dark:bg-[#272727]",
          "border border-gray-100 dark:border-white/[0.07]",
          "text-gray-700 dark:text-white/68",
          "placeholder:text-gray-300 dark:placeholder:text-white/18",
          "focus:outline-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-white/[0.12]",
          "transition-colors duration-150 overflow-hidden",
        )}
      />
      <div className="flex items-center justify-end mt-2 h-4">
        <span className={cn(
          "text-[10.5px] transition-opacity duration-300",
          status === "idle" ? "opacity-0" : "opacity-100",
          status === "saving" ? "text-gray-300 dark:text-white/25" : "text-emerald-500 dark:text-emerald-400",
        )}>
          {status === "saving" ? "saving…" : "saved ✓"}
        </span>
      </div>
    </div>
  );
}

// ─── Email iframe ─────────────────────────────────────────────────────────────
const EmailIframe = memo(function EmailIframe({ html }: { html: string }) {
  const ref           = useRef<HTMLIFrameElement>(null);
  const [h, setH]     = useState(0);
  const [ready, setR] = useState(false);

  const srcDoc = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="color-scheme" content="light">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { overflow: hidden; }
  body { margin: 0; padding: 20px 24px 28px; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; font-size: 14px; line-height: 1.7; color: #1f2937; background: transparent; overflow-x: hidden; word-break: break-word; }
  img { max-width: 100% !important; height: auto; display: block; }
  a { color: #2563eb; text-underline-offset: 2px; }
  table, td, th { max-width: 100% !important; }
  [width] { width: auto !important; max-width: 100% !important; }
  pre, code { white-space: pre-wrap; word-break: break-all; font-size: 13px; }
  blockquote { border-left: 2px solid #e5e7eb; margin: 8px 0; padding: 2px 12px; color: #9ca3af; }
</style>
</head><body>${html}</body></html>`;

  const fit = useCallback((iframe: HTMLIFrameElement) => {
    try {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      iframe.style.height = "0px";
      const s = body.scrollHeight;
      if (s > 0) { iframe.style.height = `${s}px`; setH(s); setR(true); }
    } catch {}
  }, []);

  return (
    <div className="relative">
      {!ready && (
        <div className="space-y-2 px-6 py-5">
          {[100,83,92,76,88,65,55].map((w,i) => <Skeleton key={i} className="h-[13px] rounded-sm" style={{ width:`${w}%` }} />)}
        </div>
      )}
      <iframe
        ref={ref} srcDoc={srcDoc} sandbox="allow-same-origin" title="Email"
        className={cn("w-full border-0 block", ready ? "opacity-100" : "opacity-0 absolute inset-0")}
        style={{ height: ready ? h : 0 }}
        onLoad={(e) => {
          const f = e.currentTarget;
          fit(f);
          setTimeout(() => fit(f), 250);
          setTimeout(() => fit(f), 900);
          setTimeout(() => fit(f), 2500);
        }}
      />
    </div>
  );
});

// ─── AI Summary ───────────────────────────────────────────────────────────────
export function AISummary({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  const { data, isLoading } = useThreadSummary(threadId, emailAddress);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const s = data?.summary;

  const copy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!s?.text) return;
    navigator.clipboard.writeText([s.text, s.keyPoints, s.actionItems].filter(Boolean).join("\n\n"))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [s]);

  if (!isLoading && !s?.text) return null;

  const hasKeyPoints = !!s?.keyPoints && String(s.keyPoints).trim().length > 0;
  const hasAction    = !!s?.actionItems && String(s.actionItems).trim().length > 0;

  return (
    <div className={cn(
      "mx-4 sm:mx-6 mt-4 rounded-xl",
      // DARK: subtle surface — NOT amber-bordered, NOT pure black
      "bg-black/[0.025] dark:bg-white/[0.04]",
      "border border-black/[0.06] dark:border-white/[0.07]",
    )}>
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
        <IconSparkles size={13} className="text-gray-400 dark:text-white/28 shrink-0" />
        <span className="text-[11px] font-semibold text-gray-400 dark:text-white/28 select-none shrink-0 tracking-[0.08em] uppercase">Summary</span>
        {!expanded && (
          <p className={cn("flex-1 min-w-0 text-[12px] leading-snug truncate tracking-[-0.005em]", isLoading ? "text-transparent" : "text-gray-500 dark:text-white/42")}>
            {isLoading ? <Skeleton className="h-2.5 w-full rounded-full max-w-[220px]" /> : s?.text}
          </p>
        )}
        {expanded && <span className="flex-1" />}
        <div className="flex items-center gap-0.5 shrink-0">
          {s?.text && !isLoading && (
            <span role="button" onClick={copy} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors">
              {copied ? <IconCheck size={11} className="text-emerald-500" /> : <IconCopy size={11} />}
            </span>
          )}
          <span className="w-5 h-5 flex items-center justify-center">
            <IconChevronDown size={13} className={cn("text-gray-300 dark:text-white/20 transition-transform duration-200", expanded && "rotate-180")} />
          </span>
        </div>
      </button>

      {!expanded && !isLoading && hasAction && (
        <div className="px-3.5 pb-2.5 -mt-0.5">
          <div className="flex items-center gap-1.5 w-fit max-w-full">
            <IconBolt size={11} className="text-gray-400 dark:text-white/25 shrink-0" />
            <p className="text-[11.5px] text-gray-500 dark:text-white/38 leading-snug truncate">{String(s!.actionItems)}</p>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-black/[0.05] dark:border-white/[0.06]">
          {isLoading ? (
            <div className="space-y-1.5 pt-3">{[100, 88, 72].map((w, i) => <Skeleton key={i} className="h-2.5 rounded-full" style={{ width: `${w}%` }} />)}</div>
          ) : (
            <>
              <p className="text-[13px] text-gray-600 dark:text-white/52 leading-relaxed pt-3 tracking-[-0.005em]">{s!.text}</p>
              {hasKeyPoints && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-300 dark:text-white/20 select-none">Highlights</p>
                  <ul className="space-y-1">
                    {String(s!.keyPoints).split("\n").filter(Boolean).map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-gray-500 dark:text-white/38 leading-snug">
                        <span className="mt-[6px] w-1 h-1 rounded-full bg-gray-300 dark:bg-white/18 shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasAction && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]">
                  <div className="p-1 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] shrink-0">
                    <IconBolt size={12} className="text-gray-500 dark:text-white/38" />
                  </div>
                  <div>
                    <p className="text-[9.5px] font-bold tracking-[0.08em] uppercase text-gray-300 dark:text-white/22 mb-0.5">Action</p>
                    <p className="text-[11.5px] text-gray-600 dark:text-white/52 leading-snug">{String(s!.actionItems)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Collapsed row ─────────────────────────────────────────────────────────────
function CollapsedRow({ email, onClick }: { email: FullEmail; onClick: () => void }) {
  const date = format(new Date(email.receivedAt), "MMM d, h:mm a");
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors group">
      <Avatar name={email.from.name} email={email.from.email} size={7} />
      <span className="text-[12.5px] font-medium text-gray-500 dark:text-white/38 truncate flex-1 text-left">
        {email.from.name || email.from.email}
      </span>
      <span className="text-[11px] text-gray-400 dark:text-white/22 tabular-nums shrink-0">{date}</span>
      <IconChevronDown size={13} className="text-gray-300 dark:text-white/18 shrink-0 group-hover:text-gray-500 dark:group-hover:text-white/38 transition-colors" />
    </button>
  );
}

// ─── Open email card ──────────────────────────────────────────────────────────
function OpenEmailCard({ email, onCollapse, onReply, onForward, onStar }: {
  email: FullEmail; onCollapse: () => void; onReply: () => void; onForward: () => void; onStar: () => void;
}) {
  const date    = format(new Date(email.receivedAt), "MMM d, h:mm a");
  const toNames = email.to.map(r => r.name || r.email).join(", ");

  return (
    // DARK: #1f1f1f card — elevated above #191919 base, visible depth
    <div className="rounded-2xl bg-white dark:bg-[#1f1f1f] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onCollapse} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar name={email.from.name} email={email.from.email} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-snug tracking-[-0.015em]">
              {email.from.name || email.from.email}
            </p>
            <p className="text-[11.5px] text-gray-400 dark:text-white/28 truncate mt-px">To: {toNames}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onStar} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all">
            {email.isStarred
              ? <IconStarFilled size={15} className="text-amber-400" />
              : <IconStar size={15} className="text-gray-300 dark:text-white/18 hover:text-amber-400 transition-colors" />
            }
          </button>
          <span className="text-[11px] tabular-nums text-gray-400 dark:text-white/25 ml-1">{date}</span>
          <button onClick={onCollapse} className="ml-1 w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-white/18 hover:text-gray-500 transition-colors">
            <IconChevronDown size={13} className="rotate-180" />
          </button>
        </div>
      </div>
      <div className="border-t border-black/[0.04] dark:border-white/[0.05]">
        {email.bodyHtml
          ? <EmailIframe html={email.bodyHtml} />
          : <p className="px-6 py-5 text-[14px] text-gray-700 dark:text-white/58 leading-relaxed whitespace-pre-wrap">{email.bodyText ?? email.snippet}</p>
        }
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button onClick={onReply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 dark:text-white/42 hover:text-gray-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
          <IconArrowBackUp size={14} /> Reply
        </button>
        <button onClick={onForward} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 dark:text-white/42 hover:text-gray-800 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
          <IconArrowForwardUp size={14} /> Forward
        </button>
      </div>
    </div>
  );
}

function EmailCard({ email, defaultOpen, onReply, onForward, onStar }: {
  email: FullEmail; defaultOpen: boolean; onReply: () => void; onForward: () => void; onStar: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) return <CollapsedRow email={email} onClick={() => setOpen(true)} />;
  return <OpenEmailCard email={email} onCollapse={() => setOpen(false)} onReply={onReply} onForward={onForward} onStar={onStar} />;
}

// ─── Thread detail content ────────────────────────────────────────────────────
function ThreadDetailContent({ threadId }: { threadId: string }) {
  const { data }        = useThreadDetail(threadId);
  const setActiveThread = useUIStore(s => s.setActiveThread);
  const selectedEmail   = useUIStore(s => s.selectedEmailAddress);
  const threadIds       = useUIStore(s => s.threadIds as string[] ?? []);
  const emailAction     = useEmailAction();
  const [notesOpen, setNotesOpen] = useState(false);
  const notesAnchorRef = useRef<HTMLDivElement>(null);

  if (!data.success || !data.data.emails.length) return <ThreadDetailEmpty />;

  const emails     = data.data.emails;
  const subject    = emails[0].subject || "(no subject)";
  const emailAddr  = selectedEmail ?? emails[0].emailAddress;
  const anyStarred = emails.some(e => e.isStarred);
  const isArchived = emails[0].isArchived;
  const isRead     = !emails.some(e => e.isUnread);
  const allLabels  = [...new Set(emails.flatMap(e => (e.labels ?? []).filter(l => !HIDDEN_LABELS.has(l))))];

  const dateRange = emails.length > 1
    ? `${format(new Date(emails[0].receivedAt), "MMM d")} – ${format(new Date(emails[emails.length-1].receivedAt), "MMM d")}`
    : format(new Date(emails[0].receivedAt), "MMM d, h:mm a");

  const currentIdx = threadIds.indexOf(threadId);
  const prevId = currentIdx > 0 ? threadIds[currentIdx - 1] : null;
  const nextId = currentIdx < threadIds.length - 1 ? threadIds[currentIdx + 1] : null;

  const seen = new Set<string>();
  const participants = emails.filter(e => { if (seen.has(e.from.email)) return false; seen.add(e.from.email); return true; });

  const act = useCallback((email: FullEmail, action: string) =>
    emailAction.mutate({ from: email.from.email, provider: (email.provider ?? "GOOGLE") as "GOOGLE" | "OUTLOOK", messageIds: [email.id], action: action as any }),
    [emailAction]);

  const handleStar    = useCallback(() => act(emails[0], anyStarred ? "unstar" : "star"), [emails, anyStarred, act]);
  const handleArchive = useCallback(() => act(emails[0], isArchived ? "unarchive" : "archive"), [emails, isArchived, act]);
  const handleDelete  = useCallback(() => act(emails[0], "delete"), [emails, act]);
  const handleRead    = useCallback(() => act(emails[0], isRead ? "markUnread" : "markRead"), [emails, isRead, act]);

  return (
    // DARK: #191919 — same as body base, eliminates seam vs list panel
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-[#191919]">

      {/* Top bar */}
      <div className="shrink-0 flex items-center px-4 pt-3.5 pb-2 gap-1">
        <div className="flex items-center gap-0.5">
          <TipBtn onClick={() => setActiveThread(null)} tip="Close" kbd="Esc"><IconX size={15} /></TipBtn>
          <div className="w-px h-4 bg-black/[0.07] dark:bg-white/[0.07] mx-1" />
          <TipBtn onClick={() => prevId && setActiveThread(prevId)} tip="Previous thread" kbd="K" disabled={!prevId}><IconChevronLeft size={16} /></TipBtn>
          <TipBtn onClick={() => nextId && setActiveThread(nextId)} tip="Next thread" kbd="J" disabled={!nextId}><IconChevronRight size={16} /></TipBtn>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5">
          <TipBtn tip={isRead ? "Mark unread" : "Mark read"} kbd="U" onClick={handleRead}>
            {isRead ? <IconMailOpened size={16} /> : <IconMail size={16} />}
          </TipBtn>
          <TipBtn tip={anyStarred ? "Unstar" : "Star"} kbd="S" onClick={handleStar} className={anyStarred ? "text-amber-400 hover:text-amber-500" : undefined}>
            {anyStarred ? <IconStarFilled size={16} className="text-amber-400" /> : <IconStar size={16} />}
          </TipBtn>
          <TipBtn tip={isArchived ? "Move to inbox" : "Archive"} kbd="E" onClick={handleArchive}>
            {isArchived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
          </TipBtn>
          <TipBtn tip="Delete" kbd="#" className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={handleDelete}>
            <IconTrash size={16} />
          </TipBtn>
          <div className="w-px h-4 bg-black/[0.07] dark:bg-white/[0.07] mx-0.5" />
          <div ref={notesAnchorRef} className="relative">
            <TipBtn tip="Notes" kbd="N" active={notesOpen} onClick={() => setNotesOpen(v => !v)}><IconNotes size={16} /></TipBtn>
            {notesOpen && <NotesDropdown threadId={threadId} emailAddress={emailAddr} onClose={() => setNotesOpen(false)} />}
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="shrink-0 px-6 pb-3">
        <h2 className="text-[17px] font-bold text-gray-950 dark:text-white leading-tight tracking-[-0.025em]">{subject}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11.5px] text-gray-400 dark:text-white/28 tabular-nums shrink-0">{dateRange}</span>
          <span className="text-gray-200 dark:text-white/12 text-[10px]">·</span>
          <span className="text-[11.5px] text-gray-400 dark:text-white/28 shrink-0">{emails.length} {emails.length === 1 ? "message" : "messages"}</span>
          {allLabels.length > 0 && (
            <><span className="text-gray-200 dark:text-white/12 text-[10px]">·</span>
            <div className="flex items-center gap-1">{allLabels.slice(0, 4).map(l => <LabelDot key={l} label={l} />)}</div></>
          )}
          {participants.length > 0 && (
            <><span className="text-gray-200 dark:text-white/12 text-[10px]">·</span>
            <div className="flex items-center gap-1 flex-wrap">
              {participants.slice(0, 4).map(e => <ParticipantPill key={e.from.email} name={e.from.name} email={e.from.email} />)}
              {participants.length > 4 && <span className="text-[11px] text-gray-400 dark:text-white/25">+{participants.length - 4}</span>}
            </div></>
          )}
        </div>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={null}><AISummary threadId={threadId} emailAddress={emailAddr} /></Suspense>
        <div className="px-6 py-4 space-y-1.5">
          {emails.map((email, i) => (
            <EmailCard key={email.id} email={email} defaultOpen={i === emails.length - 1}
              onReply={() => {}} onForward={() => {}}
              onStar={() => act(email, email.isStarred ? "unstar" : "star")}
            />
          ))}
        </div>
        <div className="h-24" />
      </div>

      {/* Floating reply bar */}
      <div className="absolute bottom-0 inset-x-0 pointer-events-none pb-4 px-6">
        <div className={cn(
          "pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl",
          "bg-white/85 dark:bg-[#252525]/90 backdrop-blur-2xl",
          "shadow-[0_2px_20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_2px_24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]",
        )}>
          <button className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-[13px] font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            <IconArrowBackUp size={15} />Reply
            <kbd className="text-[10px] font-mono opacity-40 ml-0.5">R</kbd>
          </button>
          <button className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-[13px] font-medium text-gray-500 dark:text-white/45 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors">
            <IconArrowForwardUp size={15} />Forward
            <kbd className="text-[10px] font-mono opacity-40 ml-0.5">F</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ThreadDetail({ className }: { className?: string }) {
  const activeThreadId = useUIStore(s => s.activeThreadId);
  if (!activeThreadId) return <ThreadDetailEmpty className={className} />;
  return (
    <div className={cn("relative flex flex-col h-full overflow-hidden", className)}>
      <Suspense fallback={<ThreadDetailSkeleton />}>
        <ThreadDetailContent threadId={activeThreadId} />
      </Suspense>
    </div>
  );
}

function ThreadDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col h-full bg-gray-50/50 dark:bg-[#191919] p-6 gap-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">{[1,2,3].map(i => <Skeleton key={i} className="w-8 h-8 rounded-lg" />)}</div>
        <div className="flex gap-1">{[1,2,3,4,5].map(i => <Skeleton key={i} className="w-8 h-8 rounded-lg" />)}</div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="w-[22px] h-[22px] rounded-full" /><Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="space-y-2 mt-2">
        {[1,2].map(i => (
          <div key={i} className="rounded-2xl bg-white dark:bg-[#1f1f1f] p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/3 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div>
              <Skeleton className="h-2.5 w-14 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// DARK: Empty state uses #191919 — seamless with list panel, no black hole
function ThreadDetailEmpty({ className }: { className?: string }) {
  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center gap-2 text-center px-8 dark:bg-[#191919]", className)}>
      <span className="text-3xl opacity-10 select-none">✉</span>
      <p className="text-[13px] text-gray-400 dark:text-white/22">Select a thread to read</p>
    </div>
  );
}