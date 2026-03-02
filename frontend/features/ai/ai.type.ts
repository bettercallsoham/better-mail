export interface ThreadSummary {
  text: string;
  keyPoints: string;
  actionItems: string;
  sentiment: "positive" | "negative" | "neutral";
  priority: "low" | "medium" | "high";
}

export interface GetThreadSummaryResponse {
  success: boolean;
  cached: boolean;
  summary: ThreadSummary;
}

export interface GetThreadSummaryParams {
  threadId: string;
  emailAddress: string;
}

// ---------------------------------------------------------------------------
// Reply suggestions
// ---------------------------------------------------------------------------

export interface ReplySuggestion {
  tone: string;
  subject: string;
  body: string;
}

export interface SuggestReplyParams {
  threadId: string;
  emailAddress: string;
}

export interface SuggestReplyResponse {
  success: boolean;
  suggestions: ReplySuggestion[];
}

// ---------------------------------------------------------------------------
// Email compose / rewrite
// ---------------------------------------------------------------------------

export type SuggestEmailMode = "compose" | "rewrite";
export type SuggestEmailTone =
  | "formal"
  | "friendly"
  | "concise"
  | "professional"
  | "empathetic";

export interface SuggestEmailParams {
  mode: SuggestEmailMode;
  topic?: string;
  draft?: string;
  tone?: SuggestEmailTone;
  recipientName?: string;
  subjectHint?: string;
}

export interface SuggestEmailResponse {
  success: boolean;
  subject: string;
  body: string;
}
