import { apiClient } from "@/lib/api/client";
import {
  AnalyticsPeriod,
  GetAnalyticsOverviewResponse,
  GetTimePatternsResponse,
  GetSenderAnalyticsResponse,
  GetInboxHealthResponse,
  GetResponseAnalyticsResponse,
} from "./analytics.type";

function buildUrl(
  base: string,
  params: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.append(k, v);
  });
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export const analyticsService = {
  getOverview: (period?: AnalyticsPeriod, email?: string) =>
    apiClient<GetAnalyticsOverviewResponse>(
      buildUrl("/analytics/overview", { period, email }),
    ),

  getTimePatterns: (period?: AnalyticsPeriod, email?: string) =>
    apiClient<GetTimePatternsResponse>(
      buildUrl("/analytics/time-patterns", { period, email }),
    ),

  getSenderAnalytics: (period?: AnalyticsPeriod, email?: string) =>
    apiClient<GetSenderAnalyticsResponse>(
      buildUrl("/analytics/senders", { period, email }),
    ),

  getInboxHealth: (period?: AnalyticsPeriod, email?: string) =>
    apiClient<GetInboxHealthResponse>(
      buildUrl("/analytics/inbox-health", { period, email }),
    ),

  getResponseAnalytics: (period?: AnalyticsPeriod, email?: string) =>
    apiClient<GetResponseAnalyticsResponse>(
      buildUrl("/analytics/response", { period, email }),
    ),
};
