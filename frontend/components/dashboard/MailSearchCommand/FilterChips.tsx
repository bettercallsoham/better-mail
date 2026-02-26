"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, X, Mail, MailOpen, Star, Paperclip,
  Archive, Calendar as CalIcon, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import type { ActiveFilters } from "./useSearchState";

// ── Label helpers ─────────────────────────────────────────────────────

function formatLabelName(raw: string): string {
  return raw
    .replace(/^CATEGORY_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ── Portal Popover ────────────────────────────────────────────────────

interface PopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

function PortalPopover({ open, anchorRef, onClose, children, width }: PopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        popRef.current    && !popRef.current.contains(t) &&
        anchorRef.current && !anchorRef.current.contains(t)
      ) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, minWidth: width ?? 180 }}
      className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200/70 dark:border-white/8 shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden animate-in fade-in duration-100"
    >
      {children}
    </div>,
    document.body,
  );
}

// ── Status pill — inline toggle ───────────────────────────────────────

function StatusPill({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex items-center gap-1 h-[24px] px-2 rounded text-[12px] font-medium transition-all shrink-0 select-none",
        active
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/6",
      )}
    >
      <span className="opacity-60">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Dropdown chip ─────────────────────────────────────────────────────

function Chip({ label, active, icon, chipRef, onClick, onClear }: {
  label: string; active: boolean; icon: React.ReactNode;
  chipRef: React.RefObject<HTMLButtonElement>;
  onClick: () => void; onClear?: () => void;
}) {
  return (
    <button
      ref={chipRef}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex items-center gap-1 h-[24px] px-2 rounded text-[12px] font-medium transition-all shrink-0 select-none",
        active
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/6",
      )}
    >
      <span className="opacity-60">{icon}</span>
      <span>{label}</span>
      <ChevronDown className="w-2.5 h-2.5 opacity-40" />
      {active && onClear && (
        <span
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }}
          className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
}

// ── Pop list item ─────────────────────────────────────────────────────

function PopItem({ label, active, icon, onClick }: {
  label: string; active: boolean; icon?: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left transition-colors",
        active
          ? "text-gray-900 dark:text-white bg-gray-50 dark:bg-white/6"
          : "text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/4",
      )}
    >
      {icon && (
        <span className={cn("opacity-40 shrink-0", active && "opacity-80 text-blue-500")}>{icon}</span>
      )}
      <span className="flex-1">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
    </button>
  );
}

// ── Contact avatar ────────────────────────────────────────────────────

function ContactAvatar({ name, email }: { name?: string; email: string }) {
  const hue = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold"
      style={{ background: `hsl(${hue} 45% 45%)` }}
    >
      {(name || email)[0].toUpperCase()}
    </div>
  );
}

// ── Email popover — controlled, no setState-in-effect ────────────────
// The key insight: `localVal` is fully internal typed state.
// Parent `value` prop only initialises it (via useState(value)) — no sync effect needed.
// When parent clears (value → ""), we remount via `key` prop at the call site.

function EmailPopover({ initialValue, onChange, placeholder }: {
  initialValue: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localVal, setLocalVal] = useState(initialValue);
  const [debouncedVal, setDebouncedVal] = useState(initialValue);

  // Focus on mount — no setState, just a DOM side-effect
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, []);

  // Debounce for query — uses setTimeout, fires setState in callback (not directly in effect body)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedVal(localVal), 180);
    return () => clearTimeout(t);
  }, [localVal]);

  const trimmed = debouncedVal.trim();

  // Recent contacts — fires immediately on open (trimmed < 2)
  const { data: recentData } = useQuery({
    queryKey: mailboxKeys.suggestions({ limit: 8 }),
    queryFn:  () => mailboxService.getEmailSuggestions(undefined, 8),
    staleTime: 60_000,
    enabled:  trimmed.length < 2,
  });

  // Typed search
  const { data: searchData } = useQuery({
    queryKey: mailboxKeys.suggestions({ query: trimmed, limit: 8 }),
    queryFn:  () => mailboxService.getEmailSuggestions(trimmed, 8),
    staleTime: 30_000,
    enabled:  trimmed.length >= 2,
  });

  const suggestions =
    trimmed.length >= 2
      ? (searchData?.data?.suggestions  ?? [])
      : (recentData?.data?.suggestions  ?? []);

  const handleChange = (v: string) => {
    setLocalVal(v);
    onChange(v || undefined);
  };

  const commit = (v: string) => {
    setLocalVal(v);
    onChange(v || undefined);
  };

  return (
    <div className="flex flex-col" style={{ minWidth: 240, maxHeight: 320 }}>
      <div className="px-2 pt-2 pb-1.5 shrink-0">
        <input
          ref={inputRef}
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-7 px-2.5 rounded text-[12.5px] bg-gray-100 dark:bg-white/6 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25"
        />
      </div>

      {suggestions.length > 0 ? (
        <>
          <div className="h-px bg-gray-100 dark:bg-white/6 shrink-0" />
          <div className="overflow-y-auto py-1">
            {suggestions.map((s) => (
              <button
                key={s.email}
                onMouseDown={(e) => { e.preventDefault(); commit(s.email); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                  localVal === s.email
                    ? "bg-gray-50 dark:bg-white/5"
                    : "hover:bg-gray-50 dark:hover:bg-white/4",
                )}
              >
                <ContactAvatar name={s.name} email={s.email} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[12.5px] text-gray-700 dark:text-white/70 truncate leading-tight">
                    {s.name || s.email}
                  </span>
                  {s.name && (
                    <span className="text-[10.5px] text-gray-400 dark:text-white/28 truncate">{s.email}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="px-3 py-2.5 text-[11.5px] text-gray-400 dark:text-white/25 text-center shrink-0">
          No contacts found
        </p>
      )}
    </div>
  );
}

// ── Labels popover — beautiful tag-style rows ─────────────────────────

function LabelsPopover({ active, onSelect, onClose }: {
  active: string | undefined;
  onSelect: (label: string | undefined) => void;
  onClose: () => void;
}) {
  const { data } = useQuery({
    queryKey: mailboxKeys.folders(),
    queryFn:  () => mailboxService.getFolders(undefined),
    staleTime: 60_000,
  });

  const labels = data?.data?.labels ?? [];

  return (
    <div style={{ minWidth: 200, maxHeight: 300, overflowY: "auto" }}>
      {/* Header */}
      <div className="px-3 pt-2.5 pb-1.5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400/70 dark:text-white/20 select-none">
          Labels
        </p>
      </div>

      {labels.length === 0 && (
        <p className="px-3 pb-3 text-[12px] text-gray-400 dark:text-white/25">No labels</p>
      )}

      <div className="pb-1.5">
        {labels.map((l) => {
          const isActive = active === l.label;
          return (
            <button
              key={l.label}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(isActive ? undefined : l.label);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                isActive
                  ? "bg-gray-50 dark:bg-white/5"
                  : "hover:bg-gray-50 dark:hover:bg-white/4",
              )}
            >
              {/* Tag icon */}
              <Tag className={cn(
                "w-3 h-3 shrink-0",
                isActive ? "text-blue-500" : "text-gray-300 dark:text-white/20",
              )} />

              {/* Label name */}
              <span className={cn(
                "flex-1 text-[12.5px] truncate",
                isActive
                  ? "text-gray-900 dark:text-white font-medium"
                  : "text-gray-600 dark:text-white/55",
              )}>
                {formatLabelName(l.label)}
              </span>

              {/* Count badge */}
              {l.count > 0 && (
                <span className="text-[10.5px] tabular-nums text-gray-400 dark:text-white/25 shrink-0">
                  {l.count > 999 ? "999+" : l.count}
                </span>
              )}

              {/* Active check */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Date popover ──────────────────────────────────────────────────────

function DatePopover({ filters, onChange, onClose }: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onClose: () => void;
}) {
  return (
    <div className="py-1" style={{ minWidth: 220 }}>
      {[
        { label: "Today",         days: 0  },
        { label: "Last 7 days",   days: 7  },
        { label: "Last 30 days",  days: 30 },
        { label: "Last 3 months", days: 90 },
      ].map((p) => (
        <button
          key={p.label}
          onMouseDown={(e) => {
            e.preventDefault();
            const from = new Date();
            from.setDate(from.getDate() - p.days);
            onChange({ ...filters, dateFrom: from.toISOString().split("T")[0], dateTo: undefined });
            onClose();
          }}
          className="w-full flex items-center px-3 py-1.5 text-[13px] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors text-left"
        >
          {p.label}
        </button>
      ))}
      <div className="h-px bg-gray-100 dark:bg-white/6 my-1" />
      <div className="px-2 pb-2">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400/70 dark:text-white/20 px-1 py-1.5 select-none">
          Custom range
        </p>
        <Calendar
          mode="range"
          selected={{
            from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            to:   filters.dateTo   ? new Date(filters.dateTo)   : undefined,
          }}
          onSelect={(range) => {
            onChange({
              ...filters,
              dateFrom: range?.from ? range.from.toISOString().split("T")[0] : undefined,
              dateTo:   range?.to   ? range.to.toISOString().split("T")[0]   : undefined,
            });
          }}
          className="p-0 text-[12px]"
        />
      </div>
    </div>
  );
}

// ── Main FilterChips ──────────────────────────────────────────────────

type OpenChip = "from" | "to" | "date" | "label" | null;

const STATUS_PILLS = [
  { key: "isRead"         as const, val: false as boolean | undefined, label: "Unread",     icon: <Mail      className="w-2.5 h-2.5" /> },
  { key: "isRead"         as const, val: true  as boolean | undefined, label: "Read",       icon: <MailOpen  className="w-2.5 h-2.5" /> },
  { key: "isStarred"      as const, val: true  as boolean | undefined, label: "Starred",    icon: <Star      className="w-2.5 h-2.5" /> },
  { key: "hasAttachments" as const, val: true  as boolean | undefined, label: "Attachment", icon: <Paperclip className="w-2.5 h-2.5" /> },
  { key: "isArchived"     as const, val: true  as boolean | undefined, label: "Archived",   icon: <Archive   className="w-2.5 h-2.5" /> },
] as const;

export function FilterChips({ filters, onChange }: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
}) {
  const [open, setOpen] = useState<OpenChip>(null);
  const toggle = useCallback((key: OpenChip) => setOpen((p) => (p === key ? null : key)), []);

  const fromRef  = useRef<HTMLButtonElement>(null!);
  const toRef    = useRef<HTMLButtonElement>(null!);
  const dateRef  = useRef<HTMLButtonElement>(null!);
  const labelRef = useRef<HTMLButtonElement>(null!);

  const dateLabel = filters.dateFrom
    ? `After ${new Date(filters.dateFrom).toLocaleDateString([], { month: "short", day: "numeric" })}`
    : "Date";

  const activeLabelName = filters.labels ? formatLabelName(filters.labels) : null;
  const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 dark:border-white/[0.05] overflow-x-auto scrollbar-none">

      {/* ── Inline status pills ── */}
      {STATUS_PILLS.map((p) => (
        <StatusPill
          key={p.label}
          label={p.label}
          icon={p.icon}
          active={filters[p.key] === p.val}
          onClick={() => onChange({
            ...filters,
            [p.key]: filters[p.key] === p.val ? undefined : p.val,
          })}
        />
      ))}

      <div className="w-px h-3 bg-gray-200 dark:bg-white/8 mx-0.5 shrink-0" />

      {/* ── From ── */}
      <Chip
        chipRef={fromRef}
        label={filters.filterFrom ? `From: ${filters.filterFrom}` : "From"}
        active={!!filters.filterFrom}
        icon={<span className="text-[10px] font-bold leading-none">@</span>}
        onClick={() => toggle("from")}
        onClear={() => { onChange({ ...filters, filterFrom: undefined }); setOpen(null); }}
      />
      <PortalPopover open={open === "from"} anchorRef={fromRef} onClose={() => setOpen(null)} width={240}>
        {/* key=open ensures remount on re-open — eliminates need for sync setState effect */}
        <EmailPopover
          key={String(open === "from")}
          initialValue={filters.filterFrom ?? ""}
          onChange={(v) => onChange({ ...filters, filterFrom: v })}
          placeholder="sender@email.com"
        />
      </PortalPopover>

      {/* ── To ── */}
      <Chip
        chipRef={toRef}
        label={filters.filterTo ? `To: ${filters.filterTo}` : "To"}
        active={!!filters.filterTo}
        icon={<span className="text-[10px] font-bold leading-none">→</span>}
        onClick={() => toggle("to")}
        onClear={() => { onChange({ ...filters, filterTo: undefined }); setOpen(null); }}
      />
      <PortalPopover open={open === "to"} anchorRef={toRef} onClose={() => setOpen(null)} width={240}>
        <EmailPopover
          key={String(open === "to")}
          initialValue={filters.filterTo ?? ""}
          onChange={(v) => onChange({ ...filters, filterTo: v })}
          placeholder="recipient@email.com"
        />
      </PortalPopover>

      {/* ── Date ── */}
      <Chip
        chipRef={dateRef}
        label={dateLabel}
        active={!!(filters.dateFrom || filters.dateTo)}
        icon={<CalIcon className="w-2.5 h-2.5" />}
        onClick={() => toggle("date")}
        onClear={() => onChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
      />
      <PortalPopover open={open === "date"} anchorRef={dateRef} onClose={() => setOpen(null)}>
        <DatePopover filters={filters} onChange={onChange} onClose={() => setOpen(null)} />
      </PortalPopover>

      {/* ── Labels ── */}
      <Chip
        chipRef={labelRef}
        label={activeLabelName ?? "Labels"}
        active={!!filters.labels}
        icon={<Tag className="w-2.5 h-2.5" />}
        onClick={() => toggle("label")}
        onClear={() => onChange({ ...filters, labels: undefined })}
      />
      <PortalPopover open={open === "label"} anchorRef={labelRef} onClose={() => setOpen(null)} width={200}>
        <LabelsPopover
          active={filters.labels}
          onSelect={(v) => onChange({ ...filters, labels: v })}
          onClose={() => setOpen(null)}
        />
      </PortalPopover>

      {/* ── Clear all ── */}
      {filterCount > 0 && (
        <>
          <div className="w-px h-3 bg-gray-200 dark:bg-white/8 mx-0.5 shrink-0" />
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange({}); }}
            className="flex items-center gap-1 text-[11.5px] text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors shrink-0 px-1"
          >
            <X className="w-2.5 h-2.5" />
            Clear
          </button>
        </>
      )}
    </div>
  );
}