"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import {
  AnalyticsPeriod,
  TimePatternsData,
} from "@/features/analytics/analytics.type";

interface Props {
  data: TimePatternsData;
  period: AnalyticsPeriod;
}

const chartConfig = {
  received: {
    label: "Emails",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function buildChartData(data: TimePatternsData, period: AnalyticsPeriod) {
  if (period === "daily") {
    return Object.entries(data.hourlyDistribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([hour, count]) => ({
        label: `${hour.padStart(2, "0")}:00`,
        received: count,
      }));
  }
  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return dayOrder
    .filter((d) => d in data.dailyDistribution)
    .map((day) => ({
      label: day.slice(0, 3),
      received: data.dailyDistribution[day] ?? 0,
    }));
}

export function EmailVolumeAreaChart({ data, period }: Props) {
  const chartData = buildChartData(data, period);

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">
          Email Volume
        </CardTitle>
        <CardDescription className="text-[12px]">
          {period === "daily"
            ? "Hourly distribution today"
            : "Emails per day this week"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
            data={chartData}
            margin={{ left: -8, right: 8, top: 4, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="currentColor"
              strokeOpacity={0.06}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={28}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient
                id="insights-volume-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.45}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-received)"
                  stopOpacity={0.03}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="received"
              fill="url(#insights-volume-fill)"
              fillOpacity={1}
              stroke="var(--color-received)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
