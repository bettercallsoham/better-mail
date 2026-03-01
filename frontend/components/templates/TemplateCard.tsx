"use client";

import { useState } from "react";
import {
  IconEdit,
  IconCopy,
  IconTrash,
  IconDotsVertical,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { Template } from "@/features/templates/templates.types";
import {
  useDeleteTemplate,
  useDuplicateTemplate,
} from "@/features/templates/templates.query";
import { toast } from "sonner";

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
}

export function TemplateCard({ template, onEdit }: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const handleDelete = async () => {
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  const handleDuplicate = async () => {
    try {
      await duplicateTemplate.mutateAsync({ id: template.id });
      toast.success("Template duplicated");
    } catch {
      toast.error("Failed to duplicate template");
    }
    setMenuOpen(false);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 p-4 rounded-xl border transition-all",
        "bg-white dark:bg-white/[0.03]",
        "border-black/[0.06] dark:border-white/[0.07]",
        "hover:border-black/[0.1] dark:hover:border-white/[0.12]",
        "hover:shadow-sm",
      )}
    >
      {/* Header: name + category + menu */}
      <div className="flex items-start gap-2">
        <span className="text-[13.5px] font-semibold text-gray-800 dark:text-white/85 flex-1 leading-snug">
          {template.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {template.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] text-gray-500 dark:text-white/45 font-medium">
              {template.category}
            </span>
          )}
          {/* Actions menu */}
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen((o) => !o);
                setConfirmDelete(false);
              }}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                menuOpen
                  ? "bg-black/[0.07] dark:bg-white/[0.1] text-gray-700 dark:text-white/75"
                  : "opacity-0 group-hover:opacity-100 text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
              )}
            >
              <IconDotsVertical size={13} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(false);
                  }}
                />
                <div
                  className={cn(
                    "absolute right-0 top-full mt-1 z-50 w-40 py-1 rounded-xl",
                    "bg-white dark:bg-[#1f1f1f]",
                    "border border-black/[0.07] dark:border-white/[0.08]",
                    "shadow-[0_8px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onEdit(template);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-700 dark:text-white/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <IconEdit size={13} />
                    Edit
                  </button>
                  <button
                    onClick={handleDuplicate}
                    disabled={duplicateTemplate.isPending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-gray-700 dark:text-white/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                  >
                    <IconCopy size={13} />
                    Duplicate
                  </button>
                  <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.07]" />
                  {confirmDelete ? (
                    <div className="px-3 py-2">
                      <p className="text-[11.5px] text-gray-500 dark:text-white/40 mb-1.5">
                        Are you sure?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 h-6 rounded-md text-[11px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 border border-black/[0.08] dark:border-white/[0.1] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={deleteTemplate.isPending}
                          className="flex-1 h-6 rounded-md text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                        >
                          {deleteTemplate.isPending ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <IconTrash size={13} />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subject preview */}
      <p className="text-[12px] text-gray-500 dark:text-white/40 truncate leading-none">
        {template.subject || (
          <span className="italic opacity-60">No subject</span>
        )}
      </p>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-gray-400 dark:text-white/28 font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: usage count */}
      {template.usageCount > 0 && (
        <p className="text-[10.5px] text-gray-300 dark:text-white/20 mt-0.5">
          Used {template.usageCount}{" "}
          {template.usageCount === 1 ? "time" : "times"}
        </p>
      )}
    </div>
  );
}
