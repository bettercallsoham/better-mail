export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsMetrics {
  received: number;
  sent: number;
  read: number;
  readRate: number;
  archived: number;
  deleted: number;
  starred: number;
}

export interface AnalyticsOverviewData {
  period: AnalyticsPeriod;
  dateRange: AnalyticsDateRange;
  metrics: AnalyticsMetrics;
}

export interface GetAnalyticsOverviewResponse {
  success: boolean;
  data: AnalyticsOverviewData;
  cached: boolean;
}

// ── Analytics Time Patterns ─────────────────────────────────────────

export interface PeakHour {
  hour: number;
  count: number;
  label: string;
}

export interface TimePatternsData {
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;

  peakHours: PeakHour[];

  busiestDay: string;
  quietestDay: string;

  avgEmailsPerHour: Record<string, number>;
}

export interface GetTimePatternsResponse {
  success: boolean;
  data: TimePatternsData;
  cached: boolean;
}

// ── Sender Analytics ─────────────────────────────────────────────────────────

export interface SenderInfo {
  email: string;
  name?: string;
  volume: number;
  readRate: number;
  hasAttachments: boolean;
}

export interface SenderAnalyticsData {
  topSenders: SenderInfo[];
  /** @deprecated use categoryBreakdown */
  newsletterRatio: number;
  /** @deprecated use categoryBreakdown */
  humanRatio: number;
  categoryBreakdown: {
    human: number;
    promotions: number;
    updates: number;
    social: number;
  };
  attachmentSenders: SenderInfo[];
  totalReceived: number;
  dateRange: AnalyticsDateRange;
}

export interface GetSenderAnalyticsResponse {
  success: boolean;
  data: SenderAnalyticsData;
  cached: boolean;
}

// ── Inbox Health ─────────────────────────────────────────────────────────────

export interface InboxHealthData {
  score: number;
  stateDistribution: Record<string, number>;
  avgSnoozeDays: number;
  snoozeWeeklyBuckets: { week: string; count: number }[];
  abandonedDrafts: number;
  labelGrowth: {
    month: string;
    topLabels: { label: string; count: number }[];
  }[];
  dateRange: AnalyticsDateRange;
}

export interface GetInboxHealthResponse {
  success: boolean;
  data: InboxHealthData;
  cached: boolean;
}

// ── Response Analytics ───────────────────────────────────────────────────────

export interface ResponseAnalyticsData {
  p50MinutesToReply: number;
  p90MinutesToReply: number;
  sentByHour: Record<string, number>;
  bestSendHour: number;
  bestSendDayOfWeek: string;
  dateRange: AnalyticsDateRange;
}

export interface GetResponseAnalyticsResponse {
  success: boolean;
  data: ResponseAnalyticsData;
  cached: boolean;
}
