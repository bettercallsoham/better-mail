"use client";

import { Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnalyticsOverview,
  useTimePatterns,
  useSenderAnalytics,
  useInboxHealth,
  useResponseAnalytics,
} from "@/features/analytics/analytics.query";
import { useInboxZero } from "@/features/mailbox/mailbox.query";
import { AnalyticsPeriod } from "@/features/analytics/analytics.type";
import { MetricCard } from "@/components/analytics/MetricCard";
import { EmailVolumeAreaChart } from "@/components/analytics/EmailVolumeAreaChart";
import { PeakHoursBarChart } from "@/components/analytics/PeakHoursBarChart";
import { DayOfWeekRadarChart } from "@/components/analytics/DayOfWeekRadarChart";
import { ActionsDonutChart } from "@/components/analytics/ActionsDonutChart";
import { TopSendersTable } from "@/components/analytics/TopSendersTable";
import { NewsletterRatioDonut } from "@/components/analytics/NewsletterRatioDonut";
import { InboxHealthScore } from "@/components/analytics/InboxHealthScore";
import { SnoozePatternChart } from "@/components/analytics/SnoozePatternChart";
import { ReplyLatencyCard } from "@/components/analytics/ReplyLatencyCard";
import { BestSendWindowChart } from "@/components/analytics/BestSendWindowChart";
import { AccountSelector } from "@/components/analytics/AccountSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/lib/store/ui.store";
import { format, parseISO } from "date-fns";
import { Send, Eye, Inbox, MailOpen, BarChart2 } from "lucide-react";

// ─── Period tabs — constrained to what the backend validators accept ───────────
// validateTimePatterns: weekly | monthly only
// validateAnalyticsOverview: daily | weekly | monthly (but we match time-patterns)

type InsightsPeriod = "weekly" | "monthly";

const PERIODS: { label: string; value: InsightsPeriod }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

function formatDateRange(from: string, to: string) {
  try {
    return `${format(parseISO(from), "MMM d")} – ${format(parseISO(to), "MMM d, yyyy")}`;
  } catch {
    return "";
  }
}

// ─── Inbox Zero count card ────────────────────────────────────────────────────

function InboxZeroCard({ onOpen }: { onOpen: () => void }) {
  const { data } = useInboxZero();
  const total = data?.pages[0]?.total ?? 0;

  return (
    <MetricCard
      title="Inbox Zero"
      value={total === 0 ? "✓" : total}
      icon={Inbox}
      accentClass="bg-emerald-500/10"
      iconClass="text-emerald-500"
      description={
        total > 0
          ? `${total} thread${total === 1 ? "" : "s"} to triage`
          : "All caught up"
      }
      onClick={total > 0 ? onOpen : undefined}
      badge={
        total > 0 ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            Triage →
          </span>
        ) : undefined
      }
    />
  );
}

// ─── Metrics row ──────────────────────────────────────────────────────────────

function MetricsRow({
  period,
  email,
  onOpenInboxZero,
}: {
  period: InsightsPeriod;
  email?: string;
  onOpenInboxZero: () => void;
}) {
  const { data } = useAnalyticsOverview(period as AnalyticsPeriod, email);
  const m = data.metrics;
  const dateLabel = formatDateRange(data.dateRange.from, data.dateRange.to);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard
        title="Received"
        value={m.received.toLocaleString()}
        icon={MailOpen}
        accentClass="bg-blue-500/10"
        iconClass="text-blue-500"
        description={dateLabel}
      />
      <MetricCard
        title="Sent"
        value={m.sent.toLocaleString()}
        icon={Send}
        accentClass="bg-indigo-500/10"
        iconClass="text-indigo-500"
        description={
          m.received > 0
            ? `${Math.round((m.sent / m.received) * 100)}% send ratio`
            : dateLabel
        }
      />
      <MetricCard
        title="Read Rate"
        value={m.received > 0 ? `${Math.round(m.readRate)}%` : "—"}
        icon={Eye}
        accentClass="bg-violet-500/10"
        iconClass="text-violet-500"
        description={
          m.received > 0
            ? `${m.read.toLocaleString()} of ${m.received.toLocaleString()} opened`
            : "No emails received"
        }
      />
      <Suspense fallback={<Skeleton className="h-full rounded-2xl" />}>
        <InboxZeroCard onOpen={onOpenInboxZero} />
      </Suspense>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function ChartsSection({
  period,
  email,
}: {
  period: InsightsPeriod;
  email?: string;
}) {
  const { data: patterns } = useTimePatterns(period as AnalyticsPeriod, email);
  const { data: overview } = useAnalyticsOverview(
    period as AnalyticsPeriod,
    email,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmailVolumeAreaChart
          data={patterns}
          period={period as AnalyticsPeriod}
        />
        {/* <ActionsDonutChart metrics={overview.metrics} /> */}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PeakHoursBarChart data={patterns} />
        <DayOfWeekRadarChart data={patterns} />
      </div>
    </div>
  );
}
function SenderSection({
  period,
  email,
}: {
  period: InsightsPeriod;
  email?: string;
}) {
  const { data } = useSenderAnalytics(period as AnalyticsPeriod, email);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TopSendersTable data={data} />
      <NewsletterRatioDonut data={data} />
    </div>
  );
}

function InboxHealthSection({
  period,
  email,
}: {
  period: InsightsPeriod;
  email?: string;
}) {
  const { data } = useInboxHealth(period as AnalyticsPeriod, email);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <InboxHealthScore data={data} />
      <SnoozePatternChart data={data} />
    </div>
  );
}

function ResponseSection({
  period,
  email,
}: {
  period: InsightsPeriod;
  email?: string;
}) {
  const { data } = useResponseAnalytics(period as AnalyticsPeriod, email);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReplyLatencyCard data={data} />
      <BestSendWindowChart data={data} />
    </div>
  );
}
// ─── Skeletons ────────────────────────────────────────────────────────────────

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-70 rounded-2xl" />
        <Skeleton className="h-70 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-70 rounded-2xl" />
        <Skeleton className="h-70 rounded-2xl" />
      </div>
    </div>
  );
}

function TwoColSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [period, setPeriod] = useState<InsightsPeriod>("weekly");
  const [email, setEmail] = useState<string | undefined>(undefined);
  const setInboxZeroOpen = useUIStore((s) => s.setInboxZeroOpen);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Insights
            </h1>
            <p className="text-[12px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Your email habits at a glance
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AccountSelector value={email} onChange={setEmail} />
            <Tabs
              value={period}
              onValueChange={(v) => setPeriod(v as InsightsPeriod)}
            >
              <TabsList className="h-8">
                {PERIODS.map((p) => (
                  <TabsTrigger
                    key={p.value}
                    value={p.value}
                    className="text-[12px] px-4"
                  >
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Metric cards */}
        <Suspense fallback={<MetricsSkeleton />}>
          <MetricsRow
            period={period}
            email={email}
            onOpenInboxZero={() => setInboxZeroOpen(true)}
          />
        </Suspense>

        {/* Volume + actions charts */}
        <Suspense fallback={<ChartsSkeleton />}>
          <ChartsSection period={period} email={email} />
        </Suspense>

        {/* Sender Intelligence */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Sender Intelligence
          </h2>
          <Suspense fallback={<TwoColSkeleton />}>
            <SenderSection period={period} email={email} />
          </Suspense>
        </div>

        {/* Inbox Health */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Inbox Health
          </h2>
          <Suspense fallback={<TwoColSkeleton />}>
            <InboxHealthSection period={period} email={email} />
          </Suspense>
        </div>

        {/* Response Patterns */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Response Patterns
          </h2>
          <Suspense fallback={<TwoColSkeleton />}>
            <ResponseSection period={period} email={email} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
