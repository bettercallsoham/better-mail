"use client";

import { Suspense, useState } from "react";
import { IconTemplate } from "@tabler/icons-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "@/features/templates/templates.query";
import type { Template } from "@/features/templates/templates.types";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  onClose: () => void;
  onSelect: (template: Template) => void;
  className?: string;
}

// ─── Skeleton fallback ─────────────────────────────────────────────────────────
function TemplateListSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-3 py-2.5 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Filtered list (inside Suspense, re-fetches on search) ────────────────────
function FilteredTemplateList({
  search,
  onSelect,
  onClose,
}: {
  search: string;
  onSelect: (t: Template) => void;
  onClose: () => void;
}) {
  const { data } = useTemplates(search ? { search } : undefined);
  const templates = data?.templates ?? [];

  if (templates.length === 0) {
    return (
      <CommandEmpty>
        <div className="flex flex-col items-center gap-2 py-5 text-center">
          <IconTemplate size={22} className="text-gray-300 dark:text-white/20" />
          <p className="text-[12px] text-gray-400 dark:text-white/35">
            No templates found
          </p>
        </div>
      </CommandEmpty>
    );
  }

  return (
    <CommandGroup>
      {templates.map((t) => (
        <CommandItem
          key={t.id}
          value={`${t.name} ${t.subject} ${t.category ?? ""}`}
          onSelect={() => {
            onSelect(t);
            onClose();
          }}
          className={cn(
            "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg cursor-pointer",
            "data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.07]",
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <span className="text-[13px] font-medium text-gray-800 dark:text-white/85 truncate flex-1">
              {t.name}
            </span>
            {t.category && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.08] text-gray-500 dark:text-white/45 font-medium">
                {t.category}
              </span>
            )}
            {t.usageCount > 0 && (
              <span className="shrink-0 text-[10px] text-gray-400 dark:text-white/30 tabular-nums">
                {t.usageCount}×
              </span>
            )}
          </div>
          <span className="text-[11.5px] text-gray-400 dark:text-white/42 truncate w-full leading-none">
            {t.subject}
          </span>
          {t.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {t.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-gray-300 dark:text-white/28 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────
export function TemplatePicker({ onClose, onSelect, className }: TemplatePickerProps) {
  const [search, setSearch] = useState("");

  return (
    <div
      className={cn(
        "w-[340px] rounded-xl overflow-hidden",
        "bg-white dark:bg-[#1f1f1f]",
        "border border-black/[0.08] dark:border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]",
        "dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      <Command shouldFilter={false}>
        <div className="border-b border-black/[0.07] dark:border-white/[0.07]">
          <CommandInput
            placeholder="Search templates…"
            value={search}
            onValueChange={setSearch}
            className="text-[13px] text-gray-800 dark:text-white/80 placeholder:text-gray-300 dark:placeholder:text-white/30 h-9"
          />
        </div>
        <CommandList className="max-h-[260px] p-1">
          <Suspense fallback={<TemplateListSkeleton />}>
            <FilteredTemplateList
              search={search}
              onSelect={onSelect}
              onClose={onClose}
            />
          </Suspense>
        </CommandList>
      </Command>
    </div>
  );
}
