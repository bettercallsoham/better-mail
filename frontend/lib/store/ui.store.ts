import { create } from "zustand";
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
  labels?: string;
}

interface LayoutSlice {
  layoutMode: LayoutMode;
  sidebarCollapsed: boolean;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

interface MailboxSlice {
  selectedEmailAddress: string | null;
  activeFolder: string;
  searchQuery: string | null;
  searchFilters: SearchFilters | null;
  setSelectedEmailAddress: (email: string | null) => void;
  setActiveFolder: (folder: string) => void;
  setSearchQuery: (query: string | null, filters?: SearchFilters | null) => void;
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


const FOLDER_RESET = {
  activeThreadId:    null,
  focusedThreadId:   null,
  selectedThreadIds: [] as string[],
  searchQuery:       null,
  searchFilters:     null,
} as const;

const SEARCH_RESET = {
  searchQuery:   null,
  searchFilters: null,
} as const;


export const useUIStore = create<UIState>()((set, get) => ({
  layoutMode:       "velocity",
  sidebarCollapsed: false,

  setLayoutMode: (mode) =>
    set({ layoutMode: mode, activeThreadId: null, focusedThreadId: null }),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  selectedEmailAddress: null,
  activeFolder:         "inbox",
  searchQuery:          null,
  searchFilters:        null,

  setSelectedEmailAddress: (email) =>
    set({ selectedEmailAddress: email, ...FOLDER_RESET }),

  setActiveFolder: (folder) =>
    set({ activeFolder: folder, ...FOLDER_RESET }),

  setSearchQuery: (query, filters = null) =>
    set({
      searchQuery:       query,
      searchFilters:     filters,
      activeThreadId:    null,
      selectedThreadIds: [],
    }),

  clearSearch: () => set(SEARCH_RESET),

  activeThreadId:    null,
  focusedThreadId:   null,
  selectedThreadIds: [],
  threadIds:         [],

  setActiveThread: (id) =>
    set({
      activeThreadId:    id,
      focusedThreadId:   id ?? get().focusedThreadId,
      selectedThreadIds: id ? [id] : [],
    }),

  setFocusedThread:  (id)  => set({ focusedThreadId: id }),
  setThreadIds:      (ids) => set({ threadIds: ids }),

  toggleThreadSelection: (id) => {
    const cur = get().selectedThreadIds;
    set({
      selectedThreadIds: cur.includes(id)
        ? cur.filter((t) => t !== id)
        : [...cur, id],
    });
  },

  clearSelection: () => set({ selectedThreadIds: [] }),
}));

export const useLayoutStore = () =>
  useUIStore(useShallow((s) => ({
    layoutMode:          s.layoutMode,
    sidebarCollapsed:    s.sidebarCollapsed,
    setLayoutMode:       s.setLayoutMode,
    toggleSidebar:       s.toggleSidebar,
    setSidebarCollapsed: s.setSidebarCollapsed,
  })));

export const useMailboxStore = () =>
  useUIStore(useShallow((s) => ({
    selectedEmailAddress: s.selectedEmailAddress,
    activeFolder:         s.activeFolder,
    searchQuery:          s.searchQuery,
    searchFilters:        s.searchFilters,
    setSelectedEmailAddress: s.setSelectedEmailAddress,
    setActiveFolder:      s.setActiveFolder,
    setSearchQuery:       s.setSearchQuery,
    clearSearch:          s.clearSearch,
  })));

export const useThreadStore = () =>
  useUIStore(useShallow((s) => ({
    activeThreadId:        s.activeThreadId,
    focusedThreadId:       s.focusedThreadId,
    selectedThreadIds:     s.selectedThreadIds,
    threadIds:             s.threadIds,
    setActiveThread:       s.setActiveThread,
    setFocusedThread:      s.setFocusedThread,
    setThreadIds:          s.setThreadIds,
    toggleThreadSelection: s.toggleThreadSelection,
    clearSelection:        s.clearSelection,
  })));