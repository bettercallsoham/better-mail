import { useSuspenseQuery } from "@tanstack/react-query";
import { AnalyticsPeriod } from "./analytics.type";
import { analyticsService } from "./analytics.api";

export const analyticsKeys = {
  all: ["analytics"] as const,

  overview: (params?: { period?: AnalyticsPeriod }) =>
    [...analyticsKeys.all, "overview", params] as const,

  timePatterns: (params?: { period?: AnalyticsPeriod }) =>
    [...analyticsKeys.all, "time-patterns", params] as const,
};

export function useAnalyticsOverview(period: AnalyticsPeriod = "weekly") {
  return useSuspenseQuery({
    queryKey: analyticsKeys.overview({ period }),

    queryFn: () => analyticsService.getOverview(period),

    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,

    select: (res) => res.data,
  });
}

export function useTimePatterns(period: AnalyticsPeriod = "weekly") {
  return useSuspenseQuery({
    queryKey: analyticsKeys.timePatterns({ period }),

    queryFn: () => analyticsService.getTimePatterns(period),

    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,

    select: (res) => res.data,
  });
}
