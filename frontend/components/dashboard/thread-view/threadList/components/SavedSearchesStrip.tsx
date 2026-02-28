"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedFilterChip } from "./SavedFilterChip";
import { FilterDropdown, type FilterDropdownMode, type CategoryLabel } from "./FilterDropdown";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";
import type { SearchFilters } from "@/lib/store/ui.store";
import type {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useUpdateSavedSearch,
} from "@/features/mailbox/mailbox.query";

// ─────────────────────────────────────────────────────────────────────────────

interface SavedSearchesStripProps {
  savedSearches:     SavedSearch[] | undefined;
  searchQuery:       string | null;
  searchFilters:     SearchFilters | null;
  hasSearch:         boolean;
  categoryLabels:    CategoryLabel[];
  onLiveApply:       (q: string, f: SearchFilters | null) => void;
  onSelectSaved:     (s: SavedSearch) => void;
  deleteSavedSearch: ReturnType<typeof useDeleteSavedSearch>;
  createSavedSearch: ReturnType<typeof useCreateSavedSearch>;
  updateSavedSearch: ReturnType<typeof useUpdateSavedSearch>;
}

export function SavedSearchesStrip({
  savedSearches,
  searchQuery,
  searchFilters,
  hasSearch,
  categoryLabels,
  onLiveApply,
  onSelectSaved,
  deleteSavedSearch,
  createSavedSearch,
  updateSavedSearch,
}: SavedSearchesStripProps) {
  // Which dropdown is open: null = closed, "create" = new, string id = edit
  const [dropdownState, setDropdownState] = useState<"create" | string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isOpen     = dropdownState !== null;
  const editTarget = typeof dropdownState === "string"
    ? savedSearches?.find((s) => s.id === dropdownState) ?? null
    : null;

  const dropdownMode: FilterDropdownMode = editTarget
    ? { type: "edit", savedSearch: editTarget }
    : { type: "create" };

  const close = () => setDropdownState(null);

  return (
    // overflow-visible so the dropdown can escape the strip's height
    <div className="relative flex items-center h-[28px] border-b border-black/[0.04] dark:border-white/[0.04]">
      <div className="flex items-center gap-1 px-3 overflow-x-auto no-scrollbar flex-1 min-w-0">

        {/* ── Saved filter chips ── */}
        {savedSearches?.map((s) => {
          const isActive = hasSearch && searchQuery === s.query.searchText;
          return (
            <SavedFilterChip
              key={s.id}
              savedSearch={s}
              isActive={isActive}
              onSelect={() => onSelectSaved(s)}
              onEdit={() => setDropdownState(s.id)}
              onDelete={() => deleteSavedSearch.mutate(s.id)}
            />
          );
        })}

        {/* Divider — only when chips exist */}
        {savedSearches && savedSearches.length > 0 && (
          <div className="w-px h-3 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5 shrink-0" />
        )}

        {/* ── Always-present + Add filter button ── */}
        <button
          ref={btnRef}
          onClick={() => setDropdownState((v) => v === null ? "create" : null)}
          className={cn(
            "flex items-center gap-1 h-[22px] px-2 rounded-lg text-[11px] font-medium shrink-0 transition-all duration-100",
            dropdownState === "create"
              ? "bg-black/[0.07] dark:bg-white/[0.10] text-gray-700 dark:text-white/72"
              : "text-gray-400 dark:text-white/28 hover:text-gray-600 dark:hover:text-white/58 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
          )}
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Add filter</span>
        </button>
      </div>

      {/* ── Dropdown — key remounts fresh on each open/edit so useState seeds correctly ── */}
      <FilterDropdown
        key={dropdownState ?? "closed"}
        anchorRef={btnRef as React.RefObject<HTMLElement>}
        open={isOpen}
        mode={dropdownMode}
        onClose={close}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
        categoryLabels={categoryLabels}
        onLiveApply={onLiveApply}
        createSavedSearch={createSavedSearch}
        updateSavedSearch={updateSavedSearch}
      />
    </div>
  );
}