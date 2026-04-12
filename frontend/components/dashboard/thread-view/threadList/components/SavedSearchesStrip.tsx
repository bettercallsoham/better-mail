"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedFilterChip } from "./SavedFilterChip";
import {
  FilterDropdown,
  type FilterDropdownMode,
  type CategoryLabel,
} from "./FilterDropdown";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";
import type { SearchFilters } from "@/lib/store/ui.store";
import type {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useUpdateSavedSearch,
} from "@/features/mailbox/mailbox.query";

interface SavedSearchesStripProps {
  savedSearches: SavedSearch[] | undefined;
  searchQuery: string | null;
  searchFilters: SearchFilters | null;
  hasSearch: boolean;
  categoryLabels: CategoryLabel[];
  onSelectSaved: (s: SavedSearch) => void;
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
  onSelectSaved,
  deleteSavedSearch,
  createSavedSearch,
  updateSavedSearch,
}: SavedSearchesStripProps) {
  const [dropdownState, setDropdownState] = useState<"create" | string | null>(
    null,
  );
  const btnRef = useRef<HTMLButtonElement>(null);

  const isOpen = dropdownState !== null;
  const editTarget =
    typeof dropdownState === "string"
      ? (savedSearches?.find((s) => s.id === dropdownState) ?? null)
      : null;

  const dropdownMode: FilterDropdownMode = editTarget
    ? { type: "edit", savedSearch: editTarget }
    : { type: "create" };

  const close = () => setDropdownState(null);

  return (
    <div className="relative flex items-center h-7 border-b border-black/4 dark:border-white/4">
      <div className="flex items-center gap-1 px-3 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {savedSearches?.map((s) => {
          const isActive =
            hasSearch &&
            searchQuery === (s.query.searchText ?? null) &&
            JSON.stringify(searchFilters ?? {}) ===
              JSON.stringify(s.query.filters ?? {});
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

        {savedSearches && savedSearches.length > 0 && (
          <div className="w-px h-3 bg-black/8 dark:bg-white/8 mx-0.5 shrink-0" />
        )}

        <button
          ref={btnRef}
          onClick={() =>
            setDropdownState((v) => (v === null ? "create" : null))
          }
          className={cn(
            "flex items-center gap-1 h-5.5 px-2 rounded-md text-[11px] font-medium shrink-0 transition-all duration-100",
            dropdownState === "create"
              ? "bg-black/7 cursor-pointer dark:bg-white/10 text-gray-700 dark:text-white/72"
              : "bg-black/6 dark:bg-white/8 text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/72 hover:bg-black/8 dark:hover:bg-white/11",
          )}
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Add filter</span>
        </button>
      </div>

      <FilterDropdown
        key={dropdownState ?? "closed"}
        anchorRef={btnRef as React.RefObject<HTMLElement>}
        open={isOpen}
        mode={dropdownMode}
        onClose={close}
        categoryLabels={categoryLabels}
        savedSearches={savedSearches} // ← passed through for duplicate check
        createSavedSearch={createSavedSearch}
        updateSavedSearch={updateSavedSearch}
      />
    </div>
  );
}
