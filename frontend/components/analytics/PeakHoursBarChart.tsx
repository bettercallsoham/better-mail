"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
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
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PeakHoursBarChart({ data }: Props) {
  // Top 8 peak hours for readability
  const chartData = data.peakHours.slice(0, 8);
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
        <ChartContainer config={chartConfig} className="h-50 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={52}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.hour}
                  fill={
                    entry.count >= maxCount * 0.8
                      ? "var(--chart-1)"
                      : index < 3
                        ? "var(--chart-2)"
                        : "var(--chart-3)"
                  }
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
