import { create } from "zustand";

export type LayoutMode = "velocity" | "flow" | "zen";

interface UIState {
  layoutMode: LayoutMode;
  sidebarCollapsed: boolean;

  selectedEmailAddress: string | null;
  activeFolder: string;

  activeThreadId: string | null;
  selectedThreadIds: Set<string>;

  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedEmailAddress: (email: string | null) => void;
  setActiveFolder: (folder: string) => void;

  setActiveThread: (id: string | null) => void;
  toggleThreadSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  layoutMode: "velocity",
  sidebarCollapsed: false,

  selectedEmailAddress: null,
  activeFolder: "inbox",

  activeThreadId: null,
  selectedThreadIds: new Set(),

  setLayoutMode: (mode) => set({ layoutMode: mode }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
  set({ sidebarCollapsed: collapsed }),
  setSelectedEmailAddress: (email) =>
    set({
      selectedEmailAddress: email,
      activeThreadId: null,
      selectedThreadIds: new Set(),
    }),

  setActiveFolder: (folder) =>
    set({
      activeFolder: folder,
      activeThreadId: null,
      selectedThreadIds: new Set(),
    }),

  setActiveThread: (id) => set({ activeThreadId: id }),

  toggleThreadSelection: (id) => {
    const current = new Set(get().selectedThreadIds);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    set({ selectedThreadIds: current });
  },

  clearSelection: () => set({ selectedThreadIds: new Set() }),
}));
