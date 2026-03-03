import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export type LayoutMode = "velocity" | "flow" | "zen";

export interface SearchFilters {
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  isArchived?: boolean;
  filterFrom?: string;
  filterTo?: string;
  dateFrom?: string;
  dateTo?: string;
  labels?: string[]; // string[] — matches SavedSearchQuery.filters exactly
}

interface LayoutSlice {
  layoutMode: LayoutMode;
  sidebarCollapsed: boolean;
  shortcutsModalOpen: boolean;
  templatesBarOpen: boolean;
  mailSearchOpen: boolean;
  inboxZeroOpen: boolean;
  /** Per-mode panel split percentage (thread list width %) */
  splitPct: Record<string, number>;
  /** Draft email ID pending open in ComposeDialog */
  pendingDraftId: string | null;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSplitPct: (mode: string, pct: number) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setTemplatesBarOpen: (open: boolean) => void;
  setMailSearchOpen: (open: boolean) => void;
  setInboxZeroOpen: (open: boolean) => void;
  setPendingDraftId: (id: string | null) => void;
}

interface MailboxSlice {
  selectedEmailAddress: string | null;
  activeFolder: string;
  searchQuery: string | null;
  searchFilters: SearchFilters | null;
  setSelectedEmailAddress: (email: string | null) => void;
  setActiveFolder: (folder: string) => void;
  setSearchQuery: (
    query: string | null,
    filters?: SearchFilters | null,
  ) => void;
  clearSearch: () => void;
}

interface ThreadSlice {
  activeThreadId: string | null;
  focusedThreadId: string | null;
  selectedThreadIds: string[];
  threadIds: string[];
  setActiveThread: (id: string | null) => void;
  setFocusedThread: (id: string | null) => void;
  setThreadIds: (ids: string[]) => void;
  toggleThreadSelection: (id: string) => void;
  clearSelection: () => void;
}

type UIState = LayoutSlice & MailboxSlice & ThreadSlice;

// ─── Default split percentages ─────────────────────────────────────────────────
const DEFAULT_SPLIT: Record<string, number> = {
  velocity: 62,
  flow: 42,
  zen: 100,
};

const FOLDER_RESET = {
  activeThreadId: null,
  focusedThreadId: null,
  selectedThreadIds: [] as string[],
  searchQuery: null,
  searchFilters: null,
} as const;

const SEARCH_RESET = {
  searchQuery: null,
  searchFilters: null,
} as const;

// ─── Keys to persist across sessions ──────────────────────────────────────────
// Thread state is intentionally NOT persisted — fresh inbox on every load.
const PERSISTED_KEYS: (keyof UIState)[] = [
  "layoutMode",
  "sidebarCollapsed",
  "splitPct",
  "selectedEmailAddress",
  "activeFolder",
];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // ── Layout ──────────────────────────────────────────────────────────────
      layoutMode: "velocity",
      sidebarCollapsed: false,
      shortcutsModalOpen: false,
      templatesBarOpen: false,
      mailSearchOpen: false,
      inboxZeroOpen: false,
      splitPct: { ...DEFAULT_SPLIT },
      pendingDraftId: null,

      setLayoutMode: (mode) =>
        set({ layoutMode: mode, activeThreadId: null, focusedThreadId: null }),

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setSplitPct: (mode, pct) =>
        set((s) => ({ splitPct: { ...s.splitPct, [mode]: pct } })),

      setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
      setTemplatesBarOpen: (open) => set({ templatesBarOpen: open }),
      setMailSearchOpen: (open) => set({ mailSearchOpen: open }),
      setInboxZeroOpen: (open) => set({ inboxZeroOpen: open }),
      setPendingDraftId: (id) => set({ pendingDraftId: id }),

      // ── Mailbox ─────────────────────────────────────────────────────────────
      selectedEmailAddress: null,
      activeFolder: "inbox",
      searchQuery: null,
      searchFilters: null,

      setSelectedEmailAddress: (email) =>
        set({ selectedEmailAddress: email, ...FOLDER_RESET }),

      setActiveFolder: (folder) =>
        set({ activeFolder: folder, ...FOLDER_RESET }),

      setSearchQuery: (query, filters = null) =>
        set({
          searchQuery: query,
          searchFilters: filters,
          activeThreadId: null,
          selectedThreadIds: [],
        }),

      clearSearch: () => set(SEARCH_RESET),

      // ── Thread ──────────────────────────────────────────────────────────────
      activeThreadId: null,
      focusedThreadId: null,
      selectedThreadIds: [],
      threadIds: [],

      setActiveThread: (id) =>
        set({
          activeThreadId: id,
          focusedThreadId: id ?? get().focusedThreadId,
          selectedThreadIds: id ? [id] : [],
        }),

      setFocusedThread: (id) => set({ focusedThreadId: id }),
      setThreadIds: (ids) => set({ threadIds: ids }),

      toggleThreadSelection: (id) => {
        const cur = get().selectedThreadIds;
        set({
          selectedThreadIds: cur.includes(id)
            ? cur.filter((t) => t !== id)
            : [...cur, id],
        });
      },

      clearSelection: () => set({ selectedThreadIds: [] }),
    }),
    {
      name: "bettermail-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        Object.fromEntries(
          PERSISTED_KEYS.map((k) => [k, state[k]]),
        ) as Partial<UIState>,
    },
  ),
);

// ─── Scoped selectors (prevent over-rendering) ─────────────────────────────────
export const useLayoutStore = () =>
  useUIStore(
    useShallow((s) => ({
      layoutMode: s.layoutMode,
      sidebarCollapsed: s.sidebarCollapsed,
      splitPct: s.splitPct,
      setLayoutMode: s.setLayoutMode,
      toggleSidebar: s.toggleSidebar,
      setSidebarCollapsed: s.setSidebarCollapsed,
      setSplitPct: s.setSplitPct,
    })),
  );

export const useMailboxStore = () =>
  useUIStore(
    useShallow((s) => ({
      selectedEmailAddress: s.selectedEmailAddress,
      activeFolder: s.activeFolder,
      searchQuery: s.searchQuery,
      searchFilters: s.searchFilters,
      setSelectedEmailAddress: s.setSelectedEmailAddress,
      setActiveFolder: s.setActiveFolder,
      setSearchQuery: s.setSearchQuery,
      clearSearch: s.clearSearch,
    })),
  );

export const useThreadStore = () =>
  useUIStore(
    useShallow((s) => ({
      activeThreadId: s.activeThreadId,
      focusedThreadId: s.focusedThreadId,
      selectedThreadIds: s.selectedThreadIds,
      threadIds: s.threadIds,
      setActiveThread: s.setActiveThread,
      setFocusedThread: s.setFocusedThread,
      setThreadIds: s.setThreadIds,
      toggleThreadSelection: s.toggleThreadSelection,
      clearSelection: s.clearSelection,
    })),
  );
