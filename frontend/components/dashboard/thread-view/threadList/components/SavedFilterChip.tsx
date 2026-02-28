"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookmarkCheck, Pencil, X } from "lucide-react";
import { hexToRgba } from "./FilterDropdown";
import type { SavedSearch } from "@/features/mailbox/mailbox.type";

// ─────────────────────────────────────────────────────────────────────────────

interface SavedFilterChipProps {
  savedSearch: SavedSearch;
  isActive:    boolean;
  onSelect:    () => void;
  onEdit:      () => void;
  onDelete:    () => void;
}

export function SavedFilterChip({
  savedSearch,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: SavedFilterChipProps) {
  const [delConfirm, setDelConfirm] = useState(false);
  const color = savedSearch.color;

  // ── Color-derived style ────────────────────────────────────────────────────
  // Active:   solid tinted bg + white text (or dark text on light colors)
  // Inactive: very faint tint + normal muted text
  const activeStyle = color
    ? {
        backgroundColor: hexToRgba(color, 0.18),
        color:           color,
        borderColor:     hexToRgba(color, 0.30),
      }
    : undefined;

  const inactiveStyle = color
    ? {
        backgroundColor: hexToRgba(color, 0.07),
        borderColor:     "transparent",
      }
    : undefined;

  // ── Delete confirmation flicker ────────────────────────────────────────────
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (delConfirm) {
      onDelete();
    } else {
      setDelConfirm(true);
      // Auto-reset after 2s if not confirmed
      setTimeout(() => setDelConfirm(false), 2000);
    }
  };

  return (
    <div className="group/chip shrink-0 flex items-center">
      {/* Main chip button */}
      <button
        onClick={onSelect}
        style={isActive ? activeStyle : inactiveStyle}
        className={cn(
          "flex items-center gap-1.5 h-[22px] pl-2 pr-1.5 rounded-lg text-[11px] font-medium",
          "border transition-all duration-100",
          !color && [
            isActive
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
              : "bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-white/38 border-transparent",
          ],
          !color && !isActive && "hover:bg-black/[0.07] dark:hover:bg-white/[0.09] hover:text-gray-700 dark:hover:text-white/62",
        )}
      >
        <BookmarkCheck
          className="w-2.5 h-2.5 shrink-0 opacity-70"
          style={isActive && color ? { color } : undefined}
        />
        <span className="truncate max-w-[72px]" style={!isActive && color ? { color: `${color}cc` } : undefined}>
          {savedSearch.name}
        </span>
      </button>

      {/* Edit + delete — appear on hover */}
      <div className="flex items-center gap-px ml-0.5 opacity-0 group-hover/chip:opacity-100 transition-opacity duration-100">
        {/* Edit pencil */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-[18px] h-[18px] flex items-center justify-center rounded text-gray-300 dark:text-white/20 hover:text-gray-600 dark:hover:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all"
          title="Edit filter"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>

        {/* Delete — two-step confirm */}
        <button
          onClick={handleDeleteClick}
          className={cn(
            "h-[18px] flex items-center justify-center rounded transition-all",
            delConfirm
              ? "px-1.5 gap-1 bg-red-500/[0.12] dark:bg-red-500/[0.18] text-red-500"
              : "w-[18px] text-gray-300 dark:text-white/20 hover:text-red-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
          )}
          title={delConfirm ? "Click again to confirm" : "Remove filter"}
        >
          {delConfirm ? (
            <>
              <X className="w-2.5 h-2.5" />
              <span className="text-[10px] font-semibold">Delete?</span>
            </>
          ) : (
            <X className="w-2.5 h-2.5" />
          )}
        </button>
      </div>
    </div>
  );
}