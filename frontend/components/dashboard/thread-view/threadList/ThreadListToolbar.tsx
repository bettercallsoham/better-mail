"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/lib/store/ui.store";
import {
  mailboxKeys,
  useDeleteSavedSearch,
} from "@/features/mailbox/mailbox.query";
import { mailboxService } from "@/features/mailbox/mailbox.api";
import { cn } from "@/lib/utils";
import { Search, BookmarkCheck, X, Filter } from "lucide-react";
import { MailSearchCommand } from "../../MailSearchCommand";
import type { SearchFilters } from "@/lib/store/ui.store";

const LABEL_DISPLAY: Record<string, string> = {
  CATEGORY_PERSONAL:   "Personal",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_UPDATES:    "Updates",
  CATEGORY_SOCIAL:     "Social",
  CATEGORY_FORUMS:     "Forums",
};

// ── Summarise active filters into a human-readable string ─────────────────────
function summariseFilters(q: string | null, f: SearchFilters | null): string {
  const parts: string[] = [];
  if (q?.trim())             parts.push(`"${q.trim()}"`);  // ignore " " sentinel
  if (f?.isRead === false)   parts.push("Unread");
  if (f?.isRead === true)    parts.push("Read");
  if (f?.isStarred)          parts.push("Starred");
  if (f?.hasAttachments)     parts.push("Has attachment");
  if (f?.isArchived)         parts.push("Archived");
  if (f?.filterFrom)         parts.push(`From: ${f.filterFrom}`);
  if (f?.filterTo)           parts.push(`To: ${f.filterTo}`);
  if (f?.labels)             parts.push(`Label: ${f.labels}`);
  if (f?.dateFrom)           parts.push(`After ${f.dateFrom}`);
  return parts.join(" · ") || "Filtered";
}

export function ThreadListToolbar() {
  const layoutMode      = useUIStore((s) => s.layoutMode);
  const activeFolder    = useUIStore((s) => s.activeFolder);
  const setActiveFolder = useUIStore((s) => s.setActiveFolder);
  const selectedEmail   = useUIStore((s) => s.selectedEmailAddress);
  const searchQuery     = useUIStore((s) => s.searchQuery);
  const searchFilters   = useUIStore((s) => s.searchFilters);
  const setSearchQuery  = useUIStore((s) => s.setSearchQuery);
  const clearSearch     = useUIStore((s) => s.clearSearch);

  const [cmdOpen, setCmdOpen] = useState(false);

  const { data: foldersData } = useQuery({
    queryKey: mailboxKeys.folders(selectedEmail ?? undefined),
    queryFn:  () => mailboxService.getFolders(selectedEmail ?? undefined),
    staleTime: 60_000,
    gcTime:    5 * 60_000,
  });

  const { data: savedSearches } = useQuery({
    queryKey: mailboxKeys.savedSearches(),
    queryFn:  mailboxService.getSavedSearches,
    staleTime: 60_000,
    select:   (d) => d.data,
  });

  const deleteSavedSearch = useDeleteSavedSearch();

  // ⌘K global shortcut — single registration here (MailSearchCommand also listens
  // but only when open; this one handles the "open" direction)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const categoryPills = useMemo(
    () =>
      foldersData?.data?.labels
        ?.filter((l) => LABEL_DISPLAY[l.label])
        .map((l) => ({ id: `label:${l.label}`, label: LABEL_DISPLAY[l.label] })) ?? [],
    [foldersData],
  );

  if (layoutMode === "zen") return null;

  // Active if either plain text OR structured filters are set
  const hasSearch  = !!(searchQuery || searchFilters);
  const isFlow     = layoutMode === "flow";
  const activeDesc = hasSearch ? summariseFilters(searchQuery, searchFilters) : null;

  return (
    <>
      <MailSearchCommand open={cmdOpen} onOpenChange={setCmdOpen} />

      <div className="shrink-0 flex flex-col border-b border-black/6 dark:border-white/6">

        {/* ── Search trigger ── */}
        <div className={cn(
          "flex items-center gap-2",
          isFlow ? "px-3 pt-2.5 pb-2" : "px-3 h-10",
        )}>
          <button
            onClick={() => setCmdOpen(true)}
            className={cn(
              "flex-1 flex items-center gap-2 rounded-xl transition-all duration-150 text-left",
              isFlow
                ? "h-8 px-3 bg-black/4 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/7"
                : "h-7 px-2.5 bg-black/4 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/7",
            )}
          >
            {/* Show Filter icon when only filters are active (no text) */}
            {hasSearch && !searchQuery ? (
              <Filter className={cn(
                "shrink-0 text-blue-500",
                isFlow ? "w-3.5 h-3.5" : "w-3 h-3",
              )} />
            ) : (
              <Search className={cn(
                "shrink-0 text-gray-400 dark:text-white/25",
                isFlow ? "w-3.5 h-3.5" : "w-3 h-3",
              )} />
            )}

            {hasSearch ? (
              <span className={cn(
                "flex-1 truncate font-medium text-gray-700 dark:text-white/65",
                isFlow ? "text-[13px]" : "text-[12px]",
              )}>
                {activeDesc}
              </span>
            ) : (
              <span className={cn(
                "flex-1 text-gray-400 dark:text-white/25",
                isFlow ? "text-[13px]" : "text-[12px]",
              )}>
                Search mail…
              </span>
            )}

            <kbd className={cn(
              "shrink-0 font-mono text-gray-300 dark:text-white/18",
              isFlow ? "text-[10px]" : "text-[9px]",
            )}>
              ⌘K
            </kbd>
          </button>

          {hasSearch && (
            <button
              onClick={clearSearch}
              className={cn(
                "shrink-0 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/6 transition-all",
                isFlow ? "w-8 h-8" : "w-7 h-7",
              )}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Pills row ── */}
        <div className={cn(
          "flex items-center gap-1 overflow-x-auto scrollbar-none",
          isFlow ? "px-3 pb-2.5" : "px-2 pb-1.5",
        )}>
          <PillButton
            active={!hasSearch && activeFolder === "inbox"}
            onClick={() => { setActiveFolder("inbox"); clearSearch(); }}
            flow={isFlow}
          >
            Primary
          </PillButton>

          {categoryPills.map((tab) => (
            <PillButton
              key={tab.id}
              active={!hasSearch && activeFolder === tab.id}
              onClick={() => { setActiveFolder(tab.id); clearSearch(); }}
              flow={isFlow}
              dot
            >
              {tab.label}
            </PillButton>
          ))}

          {savedSearches && savedSearches.length > 0 && (
            <>
              <div className="w-px h-3.5 bg-black/8 dark:bg-white/8 mx-0.5 shrink-0" />
              {savedSearches.slice(0, 5).map((s) => (
                <div key={s.id} className="shrink-0 group/pill flex items-center">
                  <button
                    onClick={() => setSearchQuery(s.query.searchText, null)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11.5px] font-medium transition-all duration-150",
                      hasSearch && searchQuery === s.query.searchText
                        ? "bg-blue-500 text-white"
                        : "bg-black/4 dark:bg-white/6 text-gray-500 dark:text-white/40 hover:bg-black/7 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white/65",
                    )}
                  >
                    <BookmarkCheck className="w-3 h-3 opacity-70 shrink-0" />
                    <span className="truncate max-w-[100px]">{s.name}</span>
                  </button>
                  <button
                    onClick={() => deleteSavedSearch.mutate(s.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-gray-300 dark:text-white/15 hover:text-red-400 transition-all opacity-0 group-hover/pill:opacity-100 -ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Active search/filter bar ── */}
        {hasSearch && (
          <div className="flex items-center gap-1.5 px-3 pb-2 -mt-1 flex-wrap">
            <span className="text-[11px] text-gray-400 dark:text-white/30">
              {searchQuery?.trim() ? "Results for" : "Filtered by"}
            </span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-white/60 truncate max-w-[200px]">
              {activeDesc}
            </span>
            <button
              onClick={clearSearch}
              className="text-[11px] text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 transition-colors underline underline-offset-2"
            >
              clear
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PillButton({
  children, active, onClick, flow, dot,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  flow: boolean;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 rounded-full font-medium transition-all duration-150",
        flow ? "px-3 h-6 text-[12px]" : "px-2.5 h-6 text-[11.5px]",
        active
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
          : "bg-black/4 dark:bg-white/6 text-gray-500 dark:text-white/40 hover:bg-black/7 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white/65",
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0" />}
      {children}
    </button>
  );
}