import { apiClient } from "@/lib/api/client";
import {
  AnalyticsPeriod,
  GetAnalyticsOverviewResponse,
  GetTimePatternsResponse,
} from "./analytics.type";

export const analyticsService = {
  getOverview: (period?: AnalyticsPeriod) => {
    const searchParams = new URLSearchParams();
    if (period) searchParams.append("period", period);

    const qs = searchParams.toString();
    const url = qs ? `/analytics/overview?${qs}` : `/analytics/overview`;

    return apiClient<GetAnalyticsOverviewResponse>(url);
  },

  getTimePatterns: (period?: AnalyticsPeriod) => {
    const searchParams = new URLSearchParams();
    if (period) searchParams.append("period", period);

    const qs = searchParams.toString();
    const url = qs
      ? `/analytics/time-patterns?${qs}`
      : `/analytics/time-patterns`;

    return apiClient<GetTimePatternsResponse>(url);
  },
};
