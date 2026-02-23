"use client";

import { create } from "zustand";

export type LayoutMode = "velocity" | "flow" | "zen";

interface UIState {
  layoutMode: LayoutMode;
  sidebarCollapsed: boolean;

  selectedEmailAddress: string | null;
  activeFolder: string;

  activeThreadId: string | null;
  /** Keyboard-highlighted row — NOT yet opened */
  focusedThreadId: string | null;
  selectedThreadIds: string[];
  /** Ordered IDs from the visible thread list — for overlay prev/next */
  threadIds: string[];

  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  setSelectedEmailAddress: (email: string | null) => void;
  setActiveFolder: (folder: string) => void;

  setActiveThread: (id: string | null) => void;
  setFocusedThread: (id: string | null) => void;
  setThreadIds: (ids: string[]) => void;
  toggleThreadSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  layoutMode: "velocity",
  sidebarCollapsed: false,

  selectedEmailAddress: null,
  activeFolder: "inbox",

  activeThreadId: null,
  focusedThreadId: null,
  selectedThreadIds: [],
  threadIds: [],

  setLayoutMode: (mode) =>
    set({ layoutMode: mode, activeThreadId: null, focusedThreadId: null }),

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

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