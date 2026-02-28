"use client";

import {
  useState, useRef, useEffect, useLayoutEffect, useCallback, memo,
  forwardRef, useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, X, Mail, MailOpen, Star, Paperclip,
  Archive, Calendar as CalIcon, Tag, SlidersHorizontal, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { mailboxKeys } from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import type { ActiveFilters } from "./useSearchState";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatLabelName(raw: string): string {
  return raw.replace(/^CATEGORY_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Portal Popover
// Positions below anchor, flips right when near viewport edge.
// Does NOT intercept keyboard — keyboard is handled by parent via handleChipKeyDown.
// ─────────────────────────────────────────────────────────────────────────────

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

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width ?? 200;
    setPos({
      top:  r.bottom + 6,
      left: r.left + w > window.innerWidth - 12 ? Math.max(r.right - w, 12) : r.left,
    });
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t) && anchorRef.current && !anchorRef.current.contains(t)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, minWidth: width ?? 200 }}
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-white border border-gray-200/60 shadow-xl shadow-black/10",
        "dark:bg-[#252525] dark:border-white/[0.07] dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)]",
        "animate-in fade-in slide-in-from-top-1 duration-100",
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status options — module-level, includes shortcut letters
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = [
  { key: "isRead"         as const, val: false as boolean | undefined, label: "Unread",     icon: <Mail      className="w-3 h-3" />, shortcut: "u" },
  { key: "isRead"         as const, val: true  as boolean | undefined, label: "Read",       icon: <MailOpen  className="w-3 h-3" />, shortcut: null },
  { key: "isStarred"      as const, val: true  as boolean | undefined, label: "Starred",    icon: <Star      className="w-3 h-3" />, shortcut: "s" },
  { key: "hasAttachments" as const, val: true  as boolean | undefined, label: "Attachment", icon: <Paperclip className="w-3 h-3" />, shortcut: "a" },
  { key: "isArchived"     as const, val: true  as boolean | undefined, label: "Archived",   icon: <Archive   className="w-3 h-3" />, shortcut: "e" },
] as const;

// Shortcut letter → STATUS_OPTIONS index
const STATUS_SHORTCUT_IDX: Record<string, number> = { u: 0, s: 2, a: 3, e: 4 };

// ─────────────────────────────────────────────────────────────────────────────
// Status dropdown
// focusedIdx is driven externally (keyboard) — no internal state
// ─────────────────────────────────────────────────────────────────────────────

function StatusDropdown({
  filters, onChange, focusedIdx,
}: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  focusedIdx: number;
}) {
  return (
    <div style={{ minWidth: 210, paddingBottom: 6 }}>
      <p className="px-3 pt-3 pb-2 text-[10px] font-semibold tracking-[0.09em] uppercase select-none text-gray-400/70 dark:text-white/[0.28]">Status</p>
      {STATUS_OPTIONS.map((opt, i) => {
        const active = filters[opt.key] === opt.val;
        const kbFocused = focusedIdx === i;
        return (
          <button
            key={opt.label}
            onMouseDown={(e) => { e.preventDefault(); onChange({ ...filters, [opt.key]: active ? undefined : opt.val }); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-1.75 text-left transition-colors text-[13px]",
              kbFocused ? "bg-gray-100 dark:bg-white/[0.07]" : "hover:bg-gray-50 dark:hover:bg-white/4",
              active ? "text-gray-900 dark:text-white/90" : "text-gray-500 dark:text-white/45",
            )}
          >
            <span className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all", active ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "border border-gray-200 dark:border-white/12")}>
              {active && <Check className="w-2 h-2" />}
            </span>
            <span className={cn("shrink-0", active ? "text-gray-700 dark:text-white/60" : "text-gray-300 dark:text-white/20")}>{opt.icon}</span>
            <span className="flex-1">{opt.label}</span>
            {opt.shortcut && (
              <kbd className="text-[9px] px-1.5 py-px rounded-md bg-gray-100 dark:bg-white/6 font-mono text-gray-400 dark:text-white/20 border border-gray-200/60 dark:border-white/[0.07]">
                {opt.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Base chip
// ─────────────────────────────────────────────────────────────────────────────

const BaseChip = memo(function BaseChip({
  label, active, icon, badge, chipRef, onClick, onClear, kbFocused = false,
}: {
  label: string; active: boolean; icon?: React.ReactNode; badge?: number;
  chipRef?: React.RefObject<HTMLButtonElement>; onClick: () => void; onClear?: () => void; kbFocused?: boolean;
}) {
  return (
    <button
      ref={chipRef}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex items-center gap-1 h-6 px-2 rounded-md text-[12px] font-medium transition-all shrink-0 select-none",
        active ? "bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900"
               : "text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/6",
        kbFocused && !active && "ring-1 ring-gray-400/60 dark:ring-white/[0.28] bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-white/60",
        kbFocused && active  && "ring-1 ring-gray-500 dark:ring-white/40",
      )}
    >
      {icon && <span className="opacity-70 flex items-center">{icon}</span>}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex items-center justify-center rounded-full min-w-3.5 h-3.5 px-0.75 text-[9px] font-bold bg-white/20 dark:bg-black/20">{badge}</span>
      )}
      <ChevronDown className="w-2.5 h-2.5 opacity-40" />
      {active && onClear && (
        <span onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity flex items-center">
          <X className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Email chip
// ─────────────────────────────────────────────────────────────────────────────

const EmailChip = memo(function EmailChip({
  label, email, chipRef, onClick, onClear, kbFocused = false,
}: {
  label: string; email: string | undefined; chipRef: React.RefObject<HTMLButtonElement>;
  onClick: () => void; onClear?: () => void; kbFocused?: boolean;
}) {
  const active = !!email;
  const hue    = email ? email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 0;
  return (
    <button
      ref={chipRef}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "flex items-center gap-1 h-6 px-1.5 rounded-md text-[12px] font-medium transition-all shrink-0 select-none",
        active ? "bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900"
               : "text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/6",
        kbFocused && !active && "ring-1 ring-gray-400/60 dark:ring-white/[0.28] bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-white/60",
        kbFocused && active  && "ring-1 ring-gray-500 dark:ring-white/40",
      )}
    >
      {active
        ? <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-bold" style={{ background: `hsl(${hue} 45% 65%)`, color: "white" }}>{email![0].toUpperCase()}</div>
        : <span className="text-[10px] font-bold leading-none opacity-60">@</span>
      }
      <span>{label}</span>
      <ChevronDown className="w-2.5 h-2.5 opacity-40" />
      {active && onClear && (
        <span onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity flex items-center">
          <X className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Contact avatar
// ─────────────────────────────────────────────────────────────────────────────

const ContactAvatar = memo(function ContactAvatar({ name, email }: { name?: string; email: string }) {
  const hue = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-semibold" style={{ background: `hsl(${hue} 45% 45%)` }}>
      {(name || email)[0].toUpperCase()}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Email popover
// ─────────────────────────────────────────────────────────────────────────────

interface EmailPopoverProps {
  initialValue: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  autoFocus?: boolean;
  focusedIdx?: number;
  onTabOut?: () => void;
}




function LabelsPopover({ active, onSelect, onClose, focusedIdx }: {
  active: string | undefined;
  onSelect: (label: string | undefined) => void;
  onClose: () => void;
  focusedIdx: number;
}) {
  const { data } = useQuery({ queryKey: mailboxKeys.folders(), queryFn: () => mailboxService.getFolders(undefined), staleTime: 60_000 });
  const labels = data?.data?.labels ?? [];
  return (
    <div style={{ minWidth: 200, maxHeight: 300, overflowY: "auto" }}>
      <p className="px-3 pt-3 pb-2 text-[10px] font-semibold tracking-[0.09em] uppercase text-gray-400/70 dark:text-white/[0.28] select-none">Labels</p>
      {labels.length === 0 && <p className="px-3 pb-3 text-[12px] text-gray-400 dark:text-white/25">No labels</p>}
      <div className="pb-1.5">
        {labels.map((l, i) => {
          const isActive = active === l.label;
          return (
            <button
              key={l.label}
              onMouseDown={(e) => { e.preventDefault(); onSelect(isActive ? undefined : l.label); onClose(); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.75 text-left transition-colors text-[13px]",
                focusedIdx === i ? "bg-gray-100 dark:bg-white/[0.07]" : "hover:bg-gray-50 dark:hover:bg-white/4",
                isActive ? "text-gray-900 dark:text-white/90" : "text-gray-500 dark:text-white/45",
              )}
            >
              <Tag className={cn("w-3 h-3 shrink-0", isActive ? "text-blue-500" : "text-gray-300 dark:text-white/18")} />
              <span className="flex-1 truncate">{formatLabelName(l.label)}</span>
              {l.count > 0 && <span className="text-[10.5px] tabular-nums text-gray-400 dark:text-white/22 shrink-0">{l.count > 999 ? "999+" : l.count}</span>}
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date popover — focusedIdx over presets
// ─────────────────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: "Today",         days: 0  },
  { label: "Last 7 days",   days: 7  },
  { label: "Last 30 days",  days: 30 },
  { label: "Last 3 months", days: 90 },
] as const;

function DatePopover({ filters, onChange, onClose, focusedIdx }: {
  filters: ActiveFilters; onChange: (f: ActiveFilters) => void; onClose: () => void; focusedIdx: number;
}) {
  return (
    <div className="py-1" style={{ minWidth: 220 }}>
      <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.09em] uppercase text-gray-400/70 dark:text-white/[0.28] select-none">Quick select</p>
      {DATE_PRESETS.map((p, i) => (
        <button
          key={p.label}
          onMouseDown={(e) => {
            e.preventDefault();
            const from = new Date(); from.setDate(from.getDate() - p.days);
            onChange({ ...filters, dateFrom: from.toISOString().split("T")[0], dateTo: undefined });
            onClose();
          }}
          className={cn(
            "w-full flex items-center px-3 py-1.75 text-[13px] text-gray-600 dark:text-white/50 transition-colors text-left",
            focusedIdx === i ? "bg-gray-100 dark:bg-white/[0.07]" : "hover:bg-gray-50 dark:hover:bg-white/4",
          )}
        >
          {p.label}
        </button>
      ))}
      <div className="h-px bg-gray-100 dark:bg-white/6 my-1.5" />
      <div className="px-2 pb-2">
        <p className="text-[10px] font-semibold tracking-[0.09em] uppercase text-gray-400/70 dark:text-white/[0.28] px-1 py-1.5 select-none">Custom range</p>
        <Calendar
          mode="range"
          selected={{ from: filters.dateFrom ? new Date(filters.dateFrom) : undefined, to: filters.dateTo ? new Date(filters.dateTo) : undefined }}
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

// ─────────────────────────────────────────────────────────────────────────────
// FilterChips — public API
// ─────────────────────────────────────────────────────────────────────────────

type OpenChip = "status" | "from" | "to" | "date" | "label" | null;
const CHIP_SEQUENCE: NonNullable<OpenChip>[] = ["status", "from", "to", "date", "label"];


export interface FilterChipsHandle {
  cycleChip: (reverse?: boolean) => boolean;
  blurChips: () => void;
  handleChipKeyDown: (key: string) => boolean;
}

export interface FilterChipsProps {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onChipEscape?: () => void;
}

export const FilterChips = forwardRef<FilterChipsHandle, FilterChipsProps>(
  function FilterChips({ filters, onChange }, ref) {
    const [open,           setOpen]          = useState<OpenChip>(null);
    const [kbChipIdx,      setKbChipIdx]     = useState(-1);
    const [optionFocusIdx, setOptionFocusIdx] = useState(-1);
    const [kbOpened,       setKbOpened]      = useState(false);

    // emailSuggestCount is reported upward by EmailPopoverWithCount via callback
    const [emailSuggestCount, setEmailSuggestCount] = useState(0);

    const statusRef = useRef<HTMLButtonElement>(null!);
    const fromRef   = useRef<HTMLButtonElement>(null!);
    const toRef     = useRef<HTMLButtonElement>(null!);
    const dateRef   = useRef<HTMLButtonElement>(null!);
    const labelRef  = useRef<HTMLButtonElement>(null!);

    const closeAll = useCallback(() => { setOpen(null); setOptionFocusIdx(-1); }, []);
    const toggle   = useCallback((key: OpenChip) => { setKbOpened(false); setOpen((p) => (p === key ? null : key)); setOptionFocusIdx(-1); }, []);

    // ── Imperative handle ──────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      cycleChip: (reverse = false) => {
        // We need the current kbChipIdx; read it via functional updater trick
        // but we also need to know the new value — use a local ref snapshot.
        let nextIdx = -1;
        let inRange = true;
        setKbChipIdx((prev) => {
          nextIdx = reverse ? prev - 1 : prev + 1;
          if (nextIdx >= CHIP_SEQUENCE.length || nextIdx < 0) {
            inRange = false;
            nextIdx = -1;
          }
          return nextIdx;
        });
        // Sync open/kbOpened/optionFocusIdx in the same event tick
        if (inRange) {
          setOpen(CHIP_SEQUENCE[nextIdx]);
          setOptionFocusIdx(-1);
          setKbOpened(true);
        } else {
          setOpen(null);
          setOptionFocusIdx(-1);
          setKbOpened(false);
        }
        return inRange;
      },

      blurChips: () => {
        setKbChipIdx(-1);
        setOpen(null);
        setOptionFocusIdx(-1);
        setKbOpened(false);
      },

      handleChipKeyDown: (key: string): boolean => {
        if (!open) return false;

        // ── Arrow navigation ────────────────────────────────────────────
        if (key === "ArrowDown" || key === "ArrowUp") {
          const dir = key === "ArrowDown" ? 1 : -1;
          let max: number;
          if (open === "status") max = STATUS_OPTIONS.length - 1;
          else if (open === "from" || open === "to") max = Math.max(0, emailSuggestCount - 1);
          else if (open === "date") max = DATE_PRESETS.length - 1;
          else max = Math.max(0, labelCount - 1);
          setOptionFocusIdx((prev) => Math.min(Math.max(prev + dir, 0), max));
          return true;
        }

        // ── Enter ──────────────────────────────────────────────────────
        if (key === "Enter") {
          if (optionFocusIdx < 0) return false;
          if (open === "status") {
            const opt = STATUS_OPTIONS[optionFocusIdx];
            if (opt) {
              const active = filters[opt.key] === opt.val;
              onChange({ ...filters, [opt.key]: active ? undefined : opt.val });
              return true;
            }
          }
          if (open === "date") {
            const preset = DATE_PRESETS[optionFocusIdx];
            if (preset) {
              const from = new Date(); from.setDate(from.getDate() - preset.days);
              onChange({ ...filters, dateFrom: from.toISOString().split("T")[0], dateTo: undefined });
              closeAll();
              return true;
            }
          }
          return false;
        }

        // ── Status letter shortcuts ────────────────────────────────────
        if (open === "status") {
          const idx = STATUS_SHORTCUT_IDX[key];
          if (idx !== undefined) {
            const opt = STATUS_OPTIONS[idx];
            const active = filters[opt.key] === opt.val;
            onChange({ ...filters, [opt.key]: active ? undefined : opt.val });
            setOptionFocusIdx(idx);
            return true;
          }
        }

        // ── Tab: move to next chip ─────────────────────────────────────
        if (key === "Tab") {
          setKbChipIdx((prev) => {
            const next = prev + 1;
            if (next >= CHIP_SEQUENCE.length) {
              setOpen(null);
              setKbOpened(false);
              return -1;
            }
            setOpen(CHIP_SEQUENCE[next]);
            setKbOpened(true);
            return next;
          });
          setOptionFocusIdx(-1);
          return true;
        }

        return false;
      },
    }));

    // Derive label count directly from query data — no state sync needed
    const { data: labelsData } = useQuery({ queryKey: mailboxKeys.folders(), queryFn: () => mailboxService.getFolders(undefined), staleTime: 60_000 });
    const labelCount = labelsData?.data?.labels?.length ?? 0;

    // FIX: useCallback with setState setter — no ref mutation inside hook
    const onEmailSuggestionsLoaded = useCallback((count: number) => {
      setEmailSuggestCount(count);
    }, []);

    const activeStatusCount = STATUS_OPTIONS.filter((o) => filters[o.key] === o.val).length;
    const activeStatusLabel =
      activeStatusCount === 1 ? (STATUS_OPTIONS.find((o) => filters[o.key] === o.val)?.label ?? "Status")
      : activeStatusCount > 1 ? `${activeStatusCount} statuses`
      : "Status";

    const clearStatus = useCallback(() => {
      const c = { ...filters };
      for (const o of STATUS_OPTIONS) delete (c as Record<string, unknown>)[o.key];
      onChange(c); closeAll();
    }, [filters, onChange, closeAll]);

    const dateLabel = filters.dateFrom
      ? `After ${new Date(filters.dateFrom).toLocaleDateString([], { month: "short", day: "numeric" })}`
      : "Date";

    // FIX: filters.labels is string[] — use [0] to get the display label for the chip
    const activeLabel     = filters.labels?.[0];
    const activeLabelName = activeLabel ? formatLabelName(activeLabel) : null;

    const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;
    const divider     = <div className="w-px h-3.5 bg-gray-200 dark:bg-white/[0.07] mx-1 shrink-0" />;

    const handleEmailTabOut = useCallback(() => {
      setKbChipIdx(() => {
        const cur  = CHIP_SEQUENCE.indexOf(open as NonNullable<OpenChip>);
        const next = cur + 1;
        if (next >= CHIP_SEQUENCE.length) { setOpen(null); return -1; }
        setKbOpened(true);
        setOpen(CHIP_SEQUENCE[next]);
        return next;
      });
    }, [open]);

    return (
      <div className="flex items-center gap-0.5 px-2.5 py-1.5 overflow-x-auto scrollbar-none border-b border-gray-100 dark:border-white/5">

        {/* ── Status ── */}
        <BaseChip chipRef={statusRef} label={activeStatusLabel} active={activeStatusCount > 0} icon={<SlidersHorizontal className="w-2.5 h-2.5" />}
          badge={activeStatusCount > 1 ? activeStatusCount : undefined}
          onClick={() => { setKbChipIdx(-1); toggle("status"); }}
          onClear={activeStatusCount > 0 ? clearStatus : undefined}
          kbFocused={kbChipIdx === 0}
        />
        <PortalPopover open={open === "status"} anchorRef={statusRef} onClose={closeAll} width={210}>
          <StatusDropdown filters={filters} onChange={onChange} focusedIdx={optionFocusIdx} />
        </PortalPopover>

        {divider}

        {/* ── From ── */}
        <EmailChip chipRef={fromRef} label="From" email={filters.filterFrom}
          onClick={() => { setKbChipIdx(-1); toggle("from"); }}
          onClear={() => { onChange({ ...filters, filterFrom: undefined }); closeAll(); }}
          kbFocused={kbChipIdx === 1}
        />
        <PortalPopover open={open === "from"} anchorRef={fromRef} onClose={closeAll} width={240}>
          <EmailPopoverWithCount
            key={String(open === "from")}
            initialValue={filters.filterFrom ?? ""}
            onChange={(v) => onChange({ ...filters, filterFrom: v })}
            placeholder="sender@email.com"
            autoFocus={!kbOpened}
            focusedIdx={optionFocusIdx}
            onTabOut={handleEmailTabOut}
            onCountChange={onEmailSuggestionsLoaded}
          />
        </PortalPopover>

        {/* ── To ── */}
        <EmailChip chipRef={toRef} label="To" email={filters.filterTo}
          onClick={() => { setKbChipIdx(-1); toggle("to"); }}
          onClear={() => { onChange({ ...filters, filterTo: undefined }); closeAll(); }}
          kbFocused={kbChipIdx === 2}
        />
        <PortalPopover open={open === "to"} anchorRef={toRef} onClose={closeAll} width={240}>
          <EmailPopoverWithCount
            key={String(open === "to")}
            initialValue={filters.filterTo ?? ""}
            onChange={(v) => onChange({ ...filters, filterTo: v })}
            placeholder="recipient@email.com"
            autoFocus={!kbOpened}
            focusedIdx={optionFocusIdx}
            onTabOut={handleEmailTabOut}
            onCountChange={onEmailSuggestionsLoaded}
          />
        </PortalPopover>

        {divider}

        {/* ── Date ── */}
        <BaseChip chipRef={dateRef} label={dateLabel} active={!!(filters.dateFrom || filters.dateTo)} icon={<CalIcon className="w-2.5 h-2.5" />}
          onClick={() => { setKbChipIdx(-1); toggle("date"); }}
          onClear={() => onChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
          kbFocused={kbChipIdx === 3}
        />
        <PortalPopover open={open === "date"} anchorRef={dateRef} onClose={closeAll}>
          <DatePopover filters={filters} onChange={onChange} onClose={closeAll} focusedIdx={optionFocusIdx} />
        </PortalPopover>

        {/* ── Labels ── */}
        {/* FIX: pass labels[0] (string|undefined) to LabelsPopover which expects string|undefined */}
        {/* FIX: onSelect wraps string back into string[] to match ActiveFilters.labels */}
        <BaseChip chipRef={labelRef} label={activeLabelName ?? "Labels"} active={!!activeLabel} icon={<Tag className="w-2.5 h-2.5" />}
          onClick={() => { setKbChipIdx(-1); toggle("label"); }}
          onClear={() => onChange({ ...filters, labels: undefined })}
          kbFocused={kbChipIdx === 4}
        />
        <PortalPopover open={open === "label"} anchorRef={labelRef} onClose={closeAll} width={200}>
          <LabelsPopover
            active={activeLabel}
            onSelect={(v) => onChange({ ...filters, labels: v ? [v] : undefined })}
            onClose={closeAll}
            focusedIdx={optionFocusIdx}
          />
        </PortalPopover>

        {/* ── Clear all ── */}
        {filterCount > 0 && (
          <>
            {divider}
            <button
              onMouseDown={(e) => { e.preventDefault(); onChange({}); }}
              className="flex items-center gap-1 text-[11.5px] transition-colors shrink-0 px-1 text-gray-400 dark:text-white/22 hover:text-gray-600 dark:hover:text-white/50"
            >
              <X className="w-2.5 h-2.5" />
              Clear all
            </button>
          </>
        )}
      </div>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// EmailPopoverWithCount — thin wrapper that reports suggestion count upward
// ─────────────────────────────────────────────────────────────────────────────

function EmailPopoverWithCount({
  initialValue, onChange, placeholder, autoFocus, focusedIdx, onTabOut, onCountChange,
}: EmailPopoverProps & { onCountChange: (n: number) => void }) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [localVal, setLocalVal] = useState(initialValue);
  const [queryVal, setQueryVal] = useState(initialValue);

  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [autoFocus]);

  useEffect(() => { const t = setTimeout(() => setQueryVal(localVal), 180); return () => clearTimeout(t); }, [localVal]);

  const trimmed = queryVal.trim();
  const { data: recentData } = useQuery({ queryKey: mailboxKeys.suggestions({ limit: 8 }), queryFn: () => mailboxService.getEmailSuggestions(undefined, 8), staleTime: 60_000, enabled: trimmed.length < 2 });
  const { data: searchData } = useQuery({ queryKey: mailboxKeys.suggestions({ query: trimmed, limit: 8 }), queryFn: () => mailboxService.getEmailSuggestions(trimmed, 8), staleTime: 30_000, enabled: trimmed.length >= 2 });
  const suggestions = trimmed.length >= 2 ? (searchData?.data?.suggestions ?? []) : (recentData?.data?.suggestions ?? []);

  useEffect(() => { onCountChange(suggestions.length); }, [suggestions.length, onCountChange]);

  const handleChange = useCallback((v: string) => { setLocalVal(v); onChange(v || undefined); }, [onChange]);
  const commit = useCallback((v: string) => { setLocalVal(v); onChange(v || undefined); }, [onChange]);

  return (
    <div className="flex flex-col" style={{ minWidth: 240, maxHeight: 300 }}>
      <div className="px-2 pt-2 pb-1.5 shrink-0">
        <input
          ref={inputRef}
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); onTabOut?.(); } }}
          className="w-full h-7 px-2.5 rounded-md text-[12.5px] outline-none bg-gray-100 text-gray-900 placeholder:text-gray-400 dark:bg-white/[0.07] dark:text-white/80 dark:placeholder:text-white/25"
        />
      </div>
      {suggestions.length > 0 ? (
        <>
          <div className="h-px bg-gray-100 dark:bg-white/6 shrink-0" />
          <div className="overflow-y-auto py-1">
            {suggestions.map((sg, i) => (
              <button
                key={sg.email}
                onMouseDown={(e) => { e.preventDefault(); commit(sg.email); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                  focusedIdx === i ? "bg-gray-100 dark:bg-white/[0.07]" : "hover:bg-gray-50 dark:hover:bg-white/4",
                )}
              >
                <ContactAvatar name={sg.name} email={sg.email} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[12.5px] text-gray-700 dark:text-white/70 truncate leading-tight">{sg.name || sg.email}</span>
                  {sg.name && <span className="text-[10.5px] text-gray-400 dark:text-white/28 truncate">{sg.email}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="px-3 py-2.5 text-[11.5px] text-gray-400 dark:text-white/25 text-center shrink-0">No contacts found</p>
      )}
    </div>
  );
}