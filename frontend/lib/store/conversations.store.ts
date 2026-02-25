import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

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
}

interface ConversationSlice {
  streamingMessages: Record<string, StreamingState>;
  pendingAction: PendingAction | null;

  initStream: (conversationId: string) => void;
  appendToken: (conversationId: string, token: string) => void;
  setToolInProgress: (conversationId: string, tool: string | null) => void;
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

  completeStream: (conversationId) =>
    set((s) => {
      const existing = s.streamingMessages[conversationId];
      if (!existing) return s;
      return {
        streamingMessages: {
          ...s.streamingMessages,
          [conversationId]: {
            ...existing,
            isStreaming: false,
            toolInProgress: null,
          },
        },
      };
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