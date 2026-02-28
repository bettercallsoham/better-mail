"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import {
  Mail, Star, Paperclip, Archive, Tag, UserRound,
  Bell, TriangleAlert, AtSign, BookmarkCheck,
  Check, X, Pencil,
} from "lucide-react";
import type { SearchFilters } from "@/lib/store/ui.store";
import type { SavedSearch, CreateSavedSearchParams } from "@/features/mailbox/mailbox.type";
import type { useCreateSavedSearch, useUpdateSavedSearch } from "@/features/mailbox/mailbox.query";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryLabel {
  id:    string;
  label: string;
  raw:   string;
}

export type FilterDropdownMode =
  | { type: "create" }
  | { type: "edit"; savedSearch: SavedSearch };

export interface FilterDropdownProps {
  anchorRef:        React.RefObject<HTMLElement>;
  open:             boolean;
  mode:             FilterDropdownMode;
  onClose:          () => void;
  searchQuery:      string | null;
  searchFilters:    SearchFilters | null;
  categoryLabels:   CategoryLabel[];
  /** Called on every live filter change so results update instantly */
  onLiveApply:      (q: string, f: SearchFilters | null) => void;
  createSavedSearch: ReturnType<typeof useCreateSavedSearch>;
  updateSavedSearch: ReturnType<typeof useUpdateSavedSearch>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const PRESET_COLORS = [
  { hex: "#6366f1", label: "Indigo"   },
  { hex: "#10b981", label: "Emerald"  },
  { hex: "#f59e0b", label: "Amber"    },
  { hex: "#ef4444", label: "Red"      },
  { hex: "#8b5cf6", label: "Violet"   },
  { hex: "#06b6d4", label: "Cyan"     },
];

const LABEL_ICON: Record<string, React.ReactNode> = {
  CATEGORY_PERSONAL:   <UserRound     className="w-2.5 h-2.5" />,
  CATEGORY_PROMOTIONS: <Tag           className="w-2.5 h-2.5" />,
  CATEGORY_UPDATES:    <Bell          className="w-2.5 h-2.5" />,
  CATEGORY_SOCIAL:     <UserRound     className="w-2.5 h-2.5" />,
  CATEGORY_FORUMS:     <TriangleAlert className="w-2.5 h-2.5" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isEmptyFilters(f: SearchFilters): boolean {
  return (
    f.isRead        === undefined &&
    !f.isStarred                  &&
    !f.hasAttachments             &&
    !f.isArchived                 &&
    !f.filterFrom?.trim()         &&
    !f.filterTo?.trim()           &&
    !(f.labels?.length)           &&
    !f.dateFrom
  );
}

// Hex → rgba string for tinting chips
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FilterToggle({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2.5 h-[28px] rounded-lg text-[12px] font-medium transition-all duration-75 shrink-0",
        active
          ? "bg-zinc-900 dark:bg-white/[0.12] text-white dark:text-white/90"
          : "text-gray-500 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-800 dark:hover:text-white/70",
      )}
    >
      <span className={cn("shrink-0 transition-opacity", active ? "opacity-100" : "opacity-55")}>
        {icon}
      </span>
      {label}
      {active && (
        <span className="w-3 h-3 rounded-full bg-white/[0.20] dark:bg-white/[0.15] flex items-center justify-center ml-0.5">
          <Check className="w-1.5 h-1.5" />
        </span>
      )}
    </button>
  );
}

function InlineInput({
  icon, value, onChange, onCommit, placeholder, onClear,
}: {
  icon:        React.ReactNode;
  value:       string;
  onChange:    (v: string) => void;
  onCommit:    () => void;
  placeholder: string;
  onClear:     () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 h-[30px] px-2.5 rounded-lg transition-colors",
      "bg-black/[0.03] dark:bg-white/[0.04]",
      "border border-transparent",
      "focus-within:border-black/[0.10] dark:focus-within:border-white/[0.12]",
      "focus-within:bg-black/[0.05] dark:focus-within:bg-white/[0.06]",
    )}>
      <span className="text-gray-400 dark:text-white/25 shrink-0">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[11.5px] text-gray-700 dark:text-white/65 placeholder:text-gray-400 dark:placeholder:text-white/22 outline-none"
      />
      {value && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          className="text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/[0.06] dark:bg-white/[0.06] mx-0.5 my-1" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 text-[9.5px] font-bold tracking-[0.10em] uppercase text-gray-400 dark:text-white/22 mb-1 select-none">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function FilterDropdown({
  anchorRef,
  open,
  mode,
  onClose,
  searchQuery,
  searchFilters,
  categoryLabels,
  onLiveApply,
  createSavedSearch,
  updateSavedSearch,
}: FilterDropdownProps) {
  const panelRef     = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  const isEdit      = mode.type === "edit";
  const editTarget  = isEdit ? mode.savedSearch : null;

  // ── Draft state ─────────────────────────────────────────────────────────────
  // Seed from edit target if editing, else from current store filters
  const seedFilters = isEdit
    ? (editTarget!.query.filters as SearchFilters)
    : (searchFilters ?? {});

  const [draft,     setDraft]     = useState<SearchFilters>(() => ({ ...seedFilters }));
  const [fromVal,   setFromVal]   = useState(seedFilters?.filterFrom ?? "");
  const [toVal,     setToVal]     = useState(seedFilters?.filterTo   ?? "");
  const [saveName,  setSaveName]  = useState(editTarget?.name ?? "");
  const [saveColor, setSaveColor] = useState<string>(editTarget?.color ?? PRESET_COLORS[0].hex);
  const [saveOpen,  setSaveOpen]  = useState(isEdit); // auto-expand save row in edit mode

  // Focus save input when it opens (create mode only — edit pre-opens it)
  useEffect(() => {
    if (saveOpen && !isEdit) saveInputRef.current?.focus();
  }, [saveOpen, isEdit]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) return;
      onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose, anchorRef]);

  // ── Core: apply draft live ──────────────────────────────────────────────────
  // Declared before early return so hook order is unconditional
  const applyDraft = useCallback((next: SearchFilters) => {
    setDraft(next);
    const q = isEdit ? (editTarget!.query.searchText ?? "") : (searchQuery ?? "");
    onLiveApply(q, isEmptyFilters(next) ? null : next);
  }, [isEdit, editTarget, searchQuery, onLiveApply]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const toggleBool = (key: keyof SearchFilters, val: unknown) => {
    const next = { ...draft };
    if ((next as Record<string, unknown>)[key] === val) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = val;
    }
    applyDraft(next);
  };

  const toggleLabel = (raw: string) => {
    const current = draft.labels ?? [];
    const next: SearchFilters = {
      ...draft,
      labels: current.includes(raw)
        ? current.filter((l) => l !== raw)
        : [...current, raw],
    };
    if (!next.labels?.length) delete next.labels;
    applyDraft(next);
  };

  const commitFrom = () => applyDraft({ ...draft, filterFrom: fromVal.trim() || undefined });
  const commitTo   = () => applyDraft({ ...draft, filterTo:   toVal.trim()   || undefined });

  // ── Save / Update ────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!saveName.trim()) return;
    const q = isEdit ? (editTarget!.query.searchText ?? "") : (searchQuery ?? "");
    const params: CreateSavedSearchParams = {
      name:     saveName.trim(),
      color:    saveColor,
      query: {
        searchText: q,
        filters:    { ...(isEmptyFilters(draft) ? {} : draft) },
      },
    };

    if (isEdit) {
      updateSavedSearch.mutate({ id: editTarget!.id, ...params });
    } else {
      createSavedSearch.mutate(params);
    }
    onClose();
  };

  const hasAnyFilter =
    !isEmptyFilters(draft) || !!fromVal.trim() || !!toVal.trim() ||
    (!isEdit && !!searchQuery?.trim());

  const isPending = createSavedSearch.isPending || updateSavedSearch.isPending;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute z-50 top-full mt-1.5 left-0",
        "w-[244px] rounded-xl",
        "bg-white dark:bg-[#222225]",
        "border border-black/[0.08] dark:border-white/[0.08]",
        "shadow-[0_4px_24px_-2px_rgba(0,0,0,0.14),0_2px_6px_-1px_rgba(0,0,0,0.07)]",
        "dark:shadow-[0_4px_32px_-4px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.40)]",
        "animate-in fade-in slide-in-from-top-1 duration-100",
        "overflow-hidden",
      )}
    >
      <div className="p-1.5 flex flex-col gap-0.5">

        {/* ── Section: Quick filters ─────────────────────────────────────────── */}
        <SectionLabel>Filters</SectionLabel>
        <div className="flex flex-wrap gap-1 px-0.5 pb-1">
          <FilterToggle icon={<Mail      className="w-3 h-3" />} label="Unread"     active={draft.isRead === false}  onClick={() => toggleBool("isRead", false)} />
          <FilterToggle icon={<Star      className="w-3 h-3" />} label="Starred"    active={!!draft.isStarred}       onClick={() => toggleBool("isStarred", true)} />
          <FilterToggle icon={<Paperclip className="w-3 h-3" />} label="Attachment" active={!!draft.hasAttachments}  onClick={() => toggleBool("hasAttachments", true)} />
          <FilterToggle icon={<Archive   className="w-3 h-3" />} label="Archived"   active={!!draft.isArchived}      onClick={() => toggleBool("isArchived", true)} />
        </div>

        {/* ── Section: Labels ────────────────────────────────────────────────── */}
        {categoryLabels.length > 0 && (
          <>
            <Divider />
            <SectionLabel>Labels</SectionLabel>
            <div className="flex flex-wrap gap-1 px-0.5 pb-1">
              {categoryLabels.map((cat) => {
                const isActive = (draft.labels ?? []).includes(cat.raw);
                return (
                  <button
                    key={cat.raw}
                    onClick={() => toggleLabel(cat.raw)}
                    className={cn(
                      "flex items-center gap-1 h-[24px] px-2 rounded-lg text-[11px] font-medium transition-all duration-75",
                      isActive
                        ? "bg-zinc-900 dark:bg-white/[0.14] text-white dark:text-white/90"
                        : "bg-black/[0.04] dark:bg-white/[0.05] text-gray-500 dark:text-white/38 hover:bg-black/[0.07] dark:hover:bg-white/[0.09] hover:text-gray-800 dark:hover:text-white/72",
                    )}
                  >
                    {LABEL_ICON[cat.raw] ?? <Tag className="w-2.5 h-2.5" />}
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Section: From / To ─────────────────────────────────────────────── */}
        <Divider />
        <div className="flex flex-col gap-1 px-0.5 pb-0.5">
          <InlineInput
            icon={<AtSign className="w-3 h-3" />}
            value={fromVal}
            onChange={setFromVal}
            onCommit={commitFrom}
            placeholder="From…"
            onClear={() => { setFromVal(""); applyDraft({ ...draft, filterFrom: undefined }); }}
          />
          <InlineInput
            icon={<AtSign className="w-3 h-3" />}
            value={toVal}
            onChange={setToVal}
            onCommit={commitTo}
            placeholder="To…"
            onClear={() => { setToVal(""); applyDraft({ ...draft, filterTo: undefined }); }}
          />
        </div>

        {/* ── Section: Save ──────────────────────────────────────────────────── */}
        <Divider />
        {saveOpen ? (
          /* Save form */
          <div className="flex flex-col gap-1.5 px-0.5 pt-0.5 pb-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
            {/* Name input */}
            <div className={cn(
              "flex items-center gap-2 h-[30px] px-2.5 rounded-lg",
              "bg-black/[0.03] dark:bg-white/[0.04]",
              "border border-black/[0.09] dark:border-white/[0.11]",
              "focus-within:border-black/[0.14] dark:focus-within:border-white/[0.18]",
              "transition-colors",
            )}>
              <Pencil className="w-3 h-3 text-gray-400 dark:text-white/25 shrink-0" />
              <input
                ref={saveInputRef}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  handleSave();
                  if (e.key === "Escape") { setSaveOpen(false); setSaveName(""); }
                }}
                placeholder={isEdit ? "Rename filter…" : "Name this filter…"}
                className="flex-1 bg-transparent text-[11.5px] text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/22 outline-none"
              />
            </div>

            {/* Color picker + action buttons */}
            <div className="flex items-center gap-1.5">
              {/* Color dots */}
              <div className="flex items-center gap-1 flex-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setSaveColor(c.hex)}
                    title={c.label}
                    className="w-4 h-4 rounded-full transition-all duration-75 flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                  >
                    {saveColor === c.hex && (
                      <Check className="w-2 h-2 text-white drop-shadow-sm" />
                    )}
                  </button>
                ))}
              </div>

              {/* Cancel */}
              {!isEdit && (
                <button
                  onClick={() => { setSaveOpen(false); setSaveName(""); }}
                  className="h-[26px] px-2 rounded-lg text-[11px] font-medium text-gray-400 dark:text-white/28 hover:text-gray-600 dark:hover:text-white/55 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all"
                >
                  Cancel
                </button>
              )}

              {/* Save / Update */}
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || isPending}
                className={cn(
                  "h-[26px] px-2.5 rounded-lg text-[11px] font-semibold transition-all",
                  saveName.trim() && !isPending
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-85"
                    : "bg-black/[0.05] dark:bg-white/[0.06] text-gray-300 dark:text-white/20 cursor-not-allowed",
                )}
              >
                {isPending ? "Saving…" : isEdit ? "Update" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          /* Save trigger row */
          <button
            onClick={() => setSaveOpen(true)}
            disabled={!hasAnyFilter}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 h-[30px] rounded-lg transition-all text-left",
              hasAnyFilter
                ? "text-gray-500 dark:text-white/35 hover:text-gray-800 dark:hover:text-white/68 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                : "text-gray-300 dark:text-white/15 cursor-not-allowed",
            )}
          >
            <BookmarkCheck className="w-3 h-3 shrink-0 opacity-70" />
            <span className="text-[12px] font-medium">Save filter…</span>
          </button>
        )}
      </div>
    </div>
  );
}