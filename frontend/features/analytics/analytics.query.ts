import { useSuspenseQuery } from "@tanstack/react-query";
import { AnalyticsPeriod } from "./analytics.type";
import { analyticsService } from "./analytics.api";

export const analyticsKeys = {
  all: ["analytics"] as const,

  overview: (params?: { period?: AnalyticsPeriod; email?: string }) =>
    [...analyticsKeys.all, "overview", params] as const,

  timePatterns: (params?: { period?: AnalyticsPeriod; email?: string }) =>
    [...analyticsKeys.all, "time-patterns", params] as const,

  senders: (params?: { period?: AnalyticsPeriod; email?: string }) =>
    [...analyticsKeys.all, "senders", params] as const,

  inboxHealth: (params?: { period?: AnalyticsPeriod; email?: string }) =>
    [...analyticsKeys.all, "inbox-health", params] as const,

  response: (params?: { period?: AnalyticsPeriod; email?: string }) =>
    [...analyticsKeys.all, "response", params] as const,
};

export function useAnalyticsOverview(
  period: AnalyticsPeriod = "weekly",
  email?: string,
) {
  return useSuspenseQuery({
    queryKey: analyticsKeys.overview({ period, email }),
    queryFn: () => analyticsService.getOverview(period, email),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useTimePatterns(
  period: AnalyticsPeriod = "weekly",
  email?: string,
) {
  return useSuspenseQuery({
    queryKey: analyticsKeys.timePatterns({ period, email }),
    queryFn: () => analyticsService.getTimePatterns(period, email),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useSenderAnalytics(
  period: AnalyticsPeriod = "weekly",
  email?: string,
) {
  return useSuspenseQuery({
    queryKey: analyticsKeys.senders({ period, email }),
    queryFn: () => analyticsService.getSenderAnalytics(period, email),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useInboxHealth(
  period: AnalyticsPeriod = "weekly",
  email?: string,
) {
  return useSuspenseQuery({
    queryKey: analyticsKeys.inboxHealth({ period, email }),
    queryFn: () => analyticsService.getInboxHealth(period, email),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useResponseAnalytics(
  period: AnalyticsPeriod = "weekly",
  email?: string,
) {
  return useSuspenseQuery({
    queryKey: analyticsKeys.response({ period, email }),
    queryFn: () => analyticsService.getResponseAnalytics(period, email),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}
