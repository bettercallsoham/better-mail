import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { MessageSource } from "@/features/conversations/conversations.type";

export interface ActionItem {
  id: string;
  type: string;
  label: string;
  payload?: Record<string, unknown>;
}

export interface PendingAction {
  conversationId: string;
  actionId: string;
  description: string;
  items: ActionItem[];
}

interface StreamingState {
  content: string;
  isStreaming: boolean;
  toolInProgress: string | null;
  sources: MessageSource[];
}

interface ConversationSlice {
  streamingMessages: Record<string, StreamingState>;
  pendingAction: PendingAction | null;

  initStream: (conversationId: string) => void;
  appendToken: (conversationId: string, token: string) => void;
  setToolInProgress: (conversationId: string, tool: string | null) => void;
  addSources: (conversationId: string, sources: MessageSource[]) => void;
  completeStream: (conversationId: string) => void;
  setPendingAction: (action: PendingAction) => void;
  clearPendingAction: () => void;
}

export const useConversationStore = create<ConversationSlice>()((set) => ({
  streamingMessages: {},
  pendingAction: null,

  initStream: (conversationId) =>
    set((s) => ({
      streamingMessages: {
        ...s.streamingMessages,
        [conversationId]: {
          content: "",
          isStreaming: true,
          toolInProgress: null,
          sources: [],
        },
      },
    })),

  appendToken: (conversationId, token) =>
    set((s) => {
      const existing = s.streamingMessages[conversationId];
      if (!existing) return s;
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [conversationId]: {
            ...existing,
            content: existing.content + token,
          },
        },
      };
    }),

  setToolInProgress: (conversationId, tool) =>
    set((s) => {
      const existing = s.streamingMessages[conversationId];
      if (!existing) return s;
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [conversationId]: { ...existing, toolInProgress: tool },
        },
      };
    }),

  addSources: (conversationId, newSources) =>
    set((s) => {
      const existing = s.streamingMessages[conversationId];
      if (!existing) return s;
      // Deduplicate by emailId — new entry wins (richer data from get_email_content)
      const merged = new Map(
        existing.sources
          .filter((src) => src.emailId)
          .map((src) => [src.emailId!, src]),
      );
      for (const src of newSources) {
        if (src.emailId) merged.set(src.emailId, src);
      }
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [conversationId]: {
            ...existing,
            sources: Array.from(merged.values()),
          },
        },
      };
    }),

  completeStream: (conversationId) =>
    set((s) => {
      // Remove the entry entirely once streaming is done — keeps the map
      // lean and makes future appendToken spreads O(active conversations).
      const { [conversationId]: _, ...rest } = s.streamingMessages;
      return { streamingMessages: rest };
    }),

  setPendingAction: (action) => set({ pendingAction: action }),
  clearPendingAction: () => set({ pendingAction: null }),
}));

export const useStreamingMessage = (conversationId: string) =>
  useConversationStore(
    useShallow((s) => s.streamingMessages[conversationId] ?? null),
  );

export const usePendingAction = () =>
  useConversationStore((s) => s.pendingAction);
