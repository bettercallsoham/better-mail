"use client";

import { useState } from "react";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useTemplates } from "@/features/templates/templates.query";
import type { Template } from "@/features/templates/templates.types";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormSheet } from "./TemplateFormSheet";

export function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(
    undefined,
  );
  const [createOpen, setCreateOpen] = useState(false);

  const { data } = useTemplates(search ? { search } : undefined);
  const templates = data?.templates ?? [];

  const sheetOpen = createOpen || !!editingTemplate;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-between px-6 py-5",
          "border-b border-black/[0.06] dark:border-white/[0.06]",
        )}
      >
        <div>
          <h1 className="text-[17px] font-semibold text-gray-800 dark:text-white/85">
            Templates
          </h1>
          <p className="text-[12.5px] text-gray-400 dark:text-white/35 mt-0.5">
            {data?.total ?? 0} template{(data?.total ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className={cn(
            "flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold",
            "bg-gray-950 dark:bg-white text-white dark:text-gray-950",
            "hover:bg-gray-800 dark:hover:bg-gray-100",
            "transition-all active:scale-[0.97]",
          )}
        >
          <IconPlus size={15} />
          New template
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-6 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div className="relative max-w-xs">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-white/25 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className={cn(
              "w-full h-8 pl-8 pr-3 rounded-lg text-[12.5px] outline-none",
              "bg-black/[0.03] dark:bg-white/[0.04]",
              "border border-black/[0.07] dark:border-white/[0.07]",
              "text-gray-700 dark:text-white/75",
              "placeholder:text-gray-300 dark:placeholder:text-white/25",
              "focus:border-gray-300 dark:focus:border-white/15",
              "transition-colors",
            )}
          />
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <IconPlus size={32} className="text-gray-200 dark:text-white/15" />
            <p className="text-[13.5px] font-medium text-gray-400 dark:text-white/30">
              {search ? "No templates match your search" : "No templates yet"}
            </p>
            {!search && (
              <button
                onClick={() => setCreateOpen(true)}
                className="mt-1 text-[12.5px] text-gray-500 dark:text-white/35 underline underline-offset-2 hover:text-gray-700 dark:hover:text-white/55 transition-colors"
              >
                Create your first template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={(tpl) => setEditingTemplate(tpl)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit sheet */}
      {sheetOpen && (
        <TemplateFormSheet
          template={editingTemplate}
          onClose={() => {
            setCreateOpen(false);
            setEditingTemplate(undefined);
          }}
        />
      )}
    </div>
  );
}
