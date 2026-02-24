import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type LayoutMode = "velocity" | "flow" | "zen";

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
  setSelectedEmailAddress: (email: string | null) => void;
  setActiveFolder: (folder: string) => void;
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

export const useUIStore = create<UIState>()((set, get) => ({
  layoutMode: "velocity",
  sidebarCollapsed: false,

  setLayoutMode: (mode) =>
    set({ layoutMode: mode, activeThreadId: null, focusedThreadId: null }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  selectedEmailAddress: null,
  activeFolder: "inbox",

  setSelectedEmailAddress: (email) =>
    set({
      selectedEmailAddress: email,
      activeThreadId: null,
      focusedThreadId: null,
      selectedThreadIds: [],
    }),

  setActiveFolder: (folder) =>
    set({
      activeFolder: folder,
      activeThreadId: null,
      focusedThreadId: null,
      selectedThreadIds: [],
    }),

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
    const current = get().selectedThreadIds;
    set({
      selectedThreadIds: current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id],
    });
  },

  clearSelection: () => set({ selectedThreadIds: [] }),
}));

export const useLayoutStore = () =>
  useUIStore(
    useShallow((s) => ({
      layoutMode: s.layoutMode,
      sidebarCollapsed: s.sidebarCollapsed,
      setLayoutMode: s.setLayoutMode,
      toggleSidebar: s.toggleSidebar,
      setSidebarCollapsed: s.setSidebarCollapsed,
    })),
  );

export const useMailboxStore = () =>
  useUIStore(
    useShallow((s) => ({
      selectedEmailAddress: s.selectedEmailAddress,
      activeFolder: s.activeFolder,
      setSelectedEmailAddress: s.setSelectedEmailAddress,
      setActiveFolder: s.setActiveFolder,
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
