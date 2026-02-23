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