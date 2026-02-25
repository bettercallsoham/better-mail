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
