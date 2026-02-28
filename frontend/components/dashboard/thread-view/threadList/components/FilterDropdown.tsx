"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Mail, Star, Paperclip, Archive, Tag, UserRound,
  Bell, TriangleAlert, AtSign, Check, X, Search,
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
  anchorRef:         React.RefObject<HTMLElement>;
  open:              boolean;
  mode:              FilterDropdownMode;
  onClose:           () => void;
  categoryLabels:    CategoryLabel[];
  savedSearches:     SavedSearch[] | undefined; // ← needed for duplicate check
  createSavedSearch: ReturnType<typeof useCreateSavedSearch>;
  updateSavedSearch: ReturnType<typeof useUpdateSavedSearch>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isEmptyFilters(f: SearchFilters): boolean {
  return (
    f.isRead          === undefined &&
    !f.isStarred                    &&
    !f.hasAttachments               &&
    !f.isArchived                   &&
    !f.filterFrom?.trim()           &&
    !f.filterTo?.trim()             &&
    !(f.labels?.length)             &&
    !f.dateFrom
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function unset<T extends object>(obj: T, key: keyof T): T {
  return { ...obj, [key]: undefined };
}

function countFilters(draft: SearchFilters, queryText: string): number {
  let n = 0;
  if (queryText.trim())            n++;
  if (draft.isRead !== undefined)  n++;
  if (draft.isStarred)             n++;
  if (draft.hasAttachments)        n++;
  if (draft.isArchived)            n++;
  if (draft.filterFrom?.trim())    n++;
  if (draft.filterTo?.trim())      n++;
  if (draft.labels?.length)        n += draft.labels.length;
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TogglePill({
  icon, label, active, onClick,
}: {
  icon:    React.ReactNode;
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-md",
        "text-[11.5px] font-medium transition-all duration-75 shrink-0",
        active
          ? "bg-gray-900 dark:bg-white/[0.14] text-white dark:text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          : "bg-black/[0.04] dark:bg-white/[0.05] text-gray-500 dark:text-white/38 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-gray-800 dark:hover:text-white/68",
      )}
    >
      <span className={active ? "opacity-80" : "opacity-40"}>{icon}</span>
      {label}
      {active && <Check className="w-2.5 h-2.5 opacity-70 ml-0.5" />}
    </button>
  );
}

function SlimInput({
  icon, value, onChange, placeholder, onClear,
}: {
  icon:        React.ReactNode;
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  onClear:     () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 h-[28px] px-2.5 rounded-md",
      "bg-black/[0.03] dark:bg-white/[0.04]",
      "ring-1 ring-transparent",
      "focus-within:ring-black/[0.09] dark:focus-within:ring-white/[0.10]",
      "transition-all",
    )}>
      <span className="text-gray-350 dark:text-white/22 shrink-0 opacity-60">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[11.5px] text-gray-700 dark:text-white/65 placeholder:text-gray-350 dark:placeholder:text-white/20 outline-none"
      />
      {value && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
          className="text-gray-300 dark:text-white/18 hover:text-gray-600 dark:hover:text-white/55 transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
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
  categoryLabels,
  savedSearches,
  createSavedSearch,
  updateSavedSearch,
}: FilterDropdownProps) {
  const panelRef      = useRef<HTMLDivElement>(null);
  const nameInputRef  = useRef<HTMLInputElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);

  const isEdit     = mode.type === "edit";
  const editTarget = isEdit ? mode.savedSearch : null;

  const seedFilters: SearchFilters = isEdit
    ? ((editTarget!.query.filters as SearchFilters) ?? {})
    : {};
  const seedQuery = isEdit ? (editTarget!.query.searchText ?? "") : "";

  const [draft,      setDraft]      = useState<SearchFilters>(() => ({ ...seedFilters }));
  const [fromVal,    setFromVal]    = useState(seedFilters.filterFrom ?? "");
  const [toVal,      setToVal]      = useState(seedFilters.filterTo   ?? "");
  const [queryText,  setQueryText]  = useState(seedQuery);
  const [filterName, setFilterName] = useState(editTarget?.name ?? "");

  // ── Duplicate detection ───────────────────────────────────────────────────
  // Case-insensitive. In edit mode ignore the current item's own name.
  const isDuplicate = useMemo(() => {
    const trimmed = filterName.trim().toLowerCase();
    if (!trimmed) return false;
    return (savedSearches ?? []).some((s) => {
      // Allow keeping the same name when editing
      if (isEdit && s.id === editTarget!.id) return false;
      return s.name.trim().toLowerCase() === trimmed;
    });
  }, [filterName, savedSearches, isEdit, editTarget]);

  // Auto-focus keyword input
  useEffect(() => {
    const t = setTimeout(() => queryInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Click-outside → close
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
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  // ── Toggle helpers ────────────────────────────────────────────────────────

  const toggleBool = (key: keyof SearchFilters, val: boolean | undefined) => {
    setDraft((prev) => {
      const current = (prev as Record<keyof SearchFilters, unknown>)[key];
      return current === val ? unset(prev, key) : { ...prev, [key]: val };
    });
  };

  const toggleLabel = (raw: string) => {
    setDraft((prev) => {
      const current = prev.labels ?? [];
      const next = current.includes(raw)
        ? current.filter((l) => l !== raw)
        : [...current, raw];
      return { ...prev, labels: next.length ? next : undefined };
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!filterName.trim() || isDuplicate) {
      nameInputRef.current?.focus();
      return;
    }

    const finalDraft: SearchFilters = {
      ...draft,
      filterFrom: fromVal.trim() || undefined,
      filterTo:   toVal.trim()   || undefined,
    };

    const filtersPayload = (
      isEmptyFilters(finalDraft) ? {} : finalDraft
    ) as Record<string, unknown>;

    const params: CreateSavedSearchParams = {
      name:  filterName.trim(),
      color: undefined,
      query: {
        searchText: queryText.trim(),
        filters:    filtersPayload,
      },
    };

    if (isEdit) {
      updateSavedSearch.mutate({ id: editTarget!.id, ...params });
    } else {
      createSavedSearch.mutate(params);
    }
    onClose();
  };

  const totalCount = countFilters(
    { ...draft, filterFrom: fromVal, filterTo: toVal },
    queryText,
  );
  const canSave  = filterName.trim().length > 0 && totalCount > 0 && !isDuplicate;
  const isPending = createSavedSearch.isPending || updateSavedSearch.isPending;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute z-50 top-full mt-1.5 left-0",
        "w-[260px] rounded-xl overflow-hidden",
        "bg-white dark:bg-[#1e1e21]",
        "border border-black/[0.07] dark:border-white/[0.07]",
        "shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_8px_40px_-4px_rgba(0,0,0,0.70),0_2px_10px_rgba(0,0,0,0.40)]",
        "animate-in fade-in slide-in-from-top-1.5 duration-100",
      )}
    >
      {/* ── Keyword search ──────────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center gap-2.5 h-[38px] px-3",
        "border-b border-black/[0.06] dark:border-white/[0.06]",
      )}>
        <Search className="w-3.5 h-3.5 text-gray-350 dark:text-white/25 shrink-0" />
        <input
          ref={queryInputRef}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.stopPropagation(); onClose(); }
            if (e.key === "Enter" && canSave) handleSave();
          }}
          placeholder="Keywords…"
          className="flex-1 bg-transparent text-[13px] text-gray-800 dark:text-white/78 placeholder:text-gray-350 dark:placeholder:text-white/22 outline-none"
        />
        {queryText && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQueryText("")}
            className="text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/55 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="p-2 flex flex-col gap-2.5">

        {/* ── Boolean filters ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-gray-350 dark:text-white/18 mb-1.5 px-1 select-none">
            Filters
          </p>
          <div className="flex flex-wrap gap-1">
            <TogglePill icon={<Mail      className="w-3 h-3" />} label="Unread"     active={draft.isRead === false} onClick={() => toggleBool("isRead", false)} />
            <TogglePill icon={<Star      className="w-3 h-3" />} label="Starred"    active={!!draft.isStarred}      onClick={() => toggleBool("isStarred", true)} />
            <TogglePill icon={<Paperclip className="w-3 h-3" />} label="Attachment" active={!!draft.hasAttachments} onClick={() => toggleBool("hasAttachments", true)} />
            <TogglePill icon={<Archive   className="w-3 h-3" />} label="Archived"   active={!!draft.isArchived}     onClick={() => toggleBool("isArchived", true)} />
          </div>
        </div>

        {/* ── Labels ──────────────────────────────────────────────────────── */}
        {categoryLabels.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-gray-350 dark:text-white/18 mb-1.5 px-1 select-none">
              Labels
            </p>
            <div className="flex flex-wrap gap-1">
              {categoryLabels.map((cat) => {
                const ICON: Record<string, React.ReactNode> = {
                  CATEGORY_PERSONAL:   <UserRound     className="w-3 h-3" />,
                  CATEGORY_PROMOTIONS: <Tag           className="w-3 h-3" />,
                  CATEGORY_UPDATES:    <Bell          className="w-3 h-3" />,
                  CATEGORY_SOCIAL:     <UserRound     className="w-3 h-3" />,
                  CATEGORY_FORUMS:     <TriangleAlert className="w-3 h-3" />,
                };
                return (
                  <TogglePill
                    key={cat.raw}
                    icon={ICON[cat.raw] ?? <Tag className="w-3 h-3" />}
                    label={cat.label}
                    active={(draft.labels ?? []).includes(cat.raw)}
                    onClick={() => toggleLabel(cat.raw)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── From / To ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <SlimInput
            icon={<AtSign className="w-3 h-3" />}
            value={fromVal}
            onChange={setFromVal}
            placeholder="From address…"
            onClear={() => { setFromVal(""); setDraft((p) => ({ ...p, filterFrom: undefined })); }}
          />
          <SlimInput
            icon={<AtSign className="w-3 h-3" />}
            value={toVal}
            onChange={setToVal}
            placeholder="To address…"
            onClear={() => { setToVal(""); setDraft((p) => ({ ...p, filterTo: undefined })); }}
          />
        </div>

        {/* ── Save row ────────────────────────────────────────────────────── */}
        <div className="pt-0.5 border-t border-black/[0.05] dark:border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "flex-1 flex items-center h-[28px] px-2.5 rounded-md ring-1 transition-all",
              isDuplicate
                ? "bg-red-50 dark:bg-red-500/[0.08] ring-red-300 dark:ring-red-500/[0.35]"
                : filterName.trim()
                  ? "bg-black/[0.03] dark:bg-white/[0.04] ring-black/[0.09] dark:ring-white/[0.10]"
                  : "bg-black/[0.02] dark:bg-white/[0.03] ring-black/[0.05] dark:ring-white/[0.06]",
              !isDuplicate && "focus-within:ring-black/[0.13] dark:focus-within:ring-white/[0.15]",
            )}>
              <input
                ref={nameInputRef}
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) handleSave();
                  if (e.key === "Escape") onClose();
                }}
                placeholder={isEdit ? "Rename…" : "Name this filter…"}
                className={cn(
                  "flex-1 bg-transparent text-[11.5px] outline-none",
                  isDuplicate
                    ? "text-red-600 dark:text-red-400 placeholder:text-red-400/60"
                    : "text-gray-700 dark:text-white/68 placeholder:text-gray-350 dark:placeholder:text-white/20",
                )}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave || isPending}
              className={cn(
                "h-[28px] px-2.5 rounded-md text-[11.5px] font-semibold transition-all shrink-0",
                canSave && !isPending
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 active:scale-95"
                  : "bg-black/[0.04] dark:bg-white/[0.05] text-gray-300 dark:text-white/20 cursor-not-allowed",
              )}
            >
              {isPending ? "…" : isEdit ? "Update" : "Save"}
            </button>
          </div>

          {/* Inline duplicate warning — appears right below the input */}
          {isDuplicate && (
            <p className="mt-1.5 px-0.5 text-[10.5px] text-red-500 dark:text-red-400">
              A filter named &quot;{filterName.trim()}&quot; already exists.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}