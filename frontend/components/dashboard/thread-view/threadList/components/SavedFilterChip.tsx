"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, X } from "lucide-react";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";

interface SavedFilterChipProps {
  savedSearch: SavedSearch;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SavedFilterChip({
  savedSearch,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: SavedFilterChipProps) {
  const [delConfirm, setDelConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (delConfirm) {
      onDelete();
    } else {
      setDelConfirm(true);
      setTimeout(() => setDelConfirm(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "group/chip shrink-0 inline-flex cursor-pointer items-center rounded-md h-5.5",
        "transition-all duration-150",
        isActive
          ? "bg-gray-900 dark:bg-white/[0.14] text-white dark:text-white/88"
          : "bg-black/6 dark:bg-white/8 text-gray-700 dark:text-white/60",
      )}
    >
      {/* ── Label ─────────────────────────────────────────────────────────── */}
      <button
        onClick={onSelect}
        className="h-full cursor-pointer flex items-center pl-2 pr-1.5 text-[11px] font-medium leading-none"
      >
        <span className="truncate max-w-30">{savedSearch.name}</span>
      </button>

      {/* ── Actions: hidden (max-w-0) → visible (max-w-[48px]) on hover ───── */}
      {/*   max-width trick keeps the pill fully rounded because there's no    */}
      {/*   separate DOM element — the pill just gets wider.                   */}
      <div
        className={cn(
          "flex items-center overflow-hidden",
          "max-w-0 group-hover/chip:max-w-13.5",
          "transition-[max-width] duration-150 ease-out",
        )}
      >
        {/* Hairline separator */}
        <span
          className={cn(
            "block w-px h-3 mx-1 rounded-full shrink-0",
            isActive ? "bg-white/15" : "bg-black/12 dark:bg-white/14",
          )}
        />

        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit filter"
          className={cn(
            "w-4.5 h-4.5 flex cursor-pointer items-center justify-center rounded-full shrink-0 transition-colors",
            isActive
              ? "text-white/45 hover:text-white hover:bg-white/10"
              : "text-gray-400 dark:text-white/25 hover:text-gray-700 dark:hover:text-white/70 hover:bg-black/8 dark:hover:bg-white/9",
          )}
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>

        {/* Delete button — two-step confirm */}
        <button
          onClick={handleDeleteClick}
          title={delConfirm ? "Click again to confirm" : "Remove filter"}
          className={cn(
            "flex items-center justify-center cursor-pointer rounded-full shrink-0 transition-all mr-1",
            delConfirm
              ? "h-4.5 px-1.5 gap-0.5 bg-red-500/12 dark:bg-red-500/18 text-red-500 dark:text-red-400"
              : cn(
                  "w-4.5 h-4.5",
                  isActive
                    ? "text-white/45 hover:text-red-300 hover:bg-white/10"
                    : "text-gray-400 dark:text-white/28 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/8 dark:hover:bg-white/9",
                ),
          )}
        >
          {delConfirm ? (
            <>
              <X className="w-2.5 h-2.5 shrink-0" />
              <span className="text-[9.5px] font-semibold whitespace-nowrap">
                Del?
              </span>
            </>
          ) : (
            <X className="w-2.5 h-2.5" />
          )}
        </button>
      </div>
    </div>
  );
}
