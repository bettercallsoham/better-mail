"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InboxHealthData } from "@/features/analytics/analytics.type";
import { format, parseISO } from "date-fns";

interface Props {
  data: InboxHealthData;
}

const chartConfig = {
  count: { label: "Snoozed", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function SnoozePatternChart({ data }: Props) {
  const { snoozeWeeklyBuckets, avgSnoozeDays } = data;

  const chartData = snoozeWeeklyBuckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      week: (() => {
        try {
          return format(parseISO(b.week), "MMM d");
        } catch {
          return b.week;
        }
      })(),
      count: b.count,
    }));

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold">
          Snooze Patterns
        </CardTitle>
        <CardDescription className="text-[12px]">
          {avgSnoozeDays > 0
            ? `Avg snooze distance: ${avgSnoozeDays} day${avgSnoozeDays !== 1 ? "s" : ""}`
            : "How often you kick emails down the road"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-36 text-[12px] text-neutral-400 dark:text-neutral-500">
            No snoozed emails this period 🎉
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={chartData} barSize={16}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={24}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="count"
                fill="var(--chart-4)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
