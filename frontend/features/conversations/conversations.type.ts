import { ActionItem } from "@/lib/store/conversations.store";

export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface ToolCall {
  toolName: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status?: string;
}

export interface MessageSource {
  type: string;
  emailId?: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  messageId: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
    userDecision?: string;
  };
  toolCalls?: ToolCall[];
  sources?: MessageSource[];
}

export interface ConversationSummary {
  conversationId: string;
  userId: string;
  summary: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessagePayload {
  content: string;
}

export interface CreateConversationResponse {
  conversationId: string;
  userId: string;
  createdAt: string;
}

export interface CreateMessageResponse {
  messageId: string;
  conversationId: string;
  status: "queued";
}

export interface GetConversationsResponse {
  summaries: ConversationSummary[];
  nextCursor: string | null;
  total: number;
}

export interface GetMessagesResponse {
  conversationId: string;
  messages: ConversationMessage[];
  nextCursor: string | null;
  total: number;
}

// ── Pusher / AI Stream Events ────────────────────────────────────────

export interface AITokenEvent {
  token: string;
  timestamp: number;
}

export interface AITitleGeneratedEvent {
  title: string;
  timestamp: number;
}

export interface AIToolStartEvent {
  tool: string;
  status: "executing";
  timestamp: number;
}

export interface AIActionRequiredEvent {
  actionId: string;
  description: string;
  items: ActionItem[];
  timestamp: number;
}

export interface AICompleteEvent {
  messageId: string;
  timestamp: number;
}

export interface AIErrorEvent {
  error: string;
  timestamp: number;
}