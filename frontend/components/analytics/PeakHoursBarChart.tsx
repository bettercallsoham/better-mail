"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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
import { TimePatternsData } from "@/features/analytics/analytics.type";

interface Props {
  data: TimePatternsData;
}

const chartConfig = {
  count: {
    label: "Emails",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function hourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function PeakHoursBarChart({ data }: Props) {
  // Build full 24-hour timeline sorted by hour
  const byHour = new Map(data.peakHours.map((d) => [d.hour, d.count]));
  const chartData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: hourLabel(h),
    count: byHour.get(h) ?? 0,
  }));

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Peak Hours</CardTitle>
        <CardDescription className="text-[12px]">
          Your busiest times — best window to go heads-down
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart
            data={chartData}
            margin={{ left: -8, right: 4, top: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="peak-bar-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.95}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.4}
                />
              </linearGradient>
              <linearGradient id="peak-bar-mid" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.35}
                />
              </linearGradient>
              <linearGradient id="peak-bar-low" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-3)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-3)"
                  stopOpacity={0.15}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-neutral-200 dark:stroke-neutral-700/60"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval={5}
              tickMargin={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickMargin={4}
              width={28}
            />
            <ChartTooltip
              cursor={{ fill: "var(--neutral-100)", opacity: 0.08 }}
              content={<ChartTooltipContent hideIndicator />}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={18}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={
                    entry.count >= maxCount * 0.75
                      ? "url(#peak-bar-gradient)"
                      : entry.count >= maxCount * 0.35
                        ? "url(#peak-bar-mid)"
                        : "url(#peak-bar-low)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
