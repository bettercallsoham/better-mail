"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
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
import { ResponseAnalyticsData } from "@/features/analytics/analytics.type";

interface Props {
  data: ResponseAnalyticsData;
}

const chartConfig = {
  sent: { label: "Sent", color: "var(--chart-2)" },
} satisfies ChartConfig;

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function BestSendWindowChart({ data }: Props) {
  const { sentByHour, bestSendHour } = data;

  const chartData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: hourLabel(i),
    sent: sentByHour[i.toString()] ?? 0,
    isBest: i === bestSendHour,
  }));

  const totalSent = chartData.reduce((s, d) => s + d.sent, 0);

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold">
          When You Send
        </CardTitle>
        <CardDescription className="text-[12px]">
          {totalSent > 0
            ? `${totalSent.toLocaleString()} emails sent — peak at ${hourLabel(bestSendHour)}`
            : "Hourly distribution of sent emails"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {totalSent === 0 ? (
          <div className="flex items-center justify-center h-36 text-[12px] text-neutral-400 dark:text-neutral-500">
            No sent emails this period
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <BarChart data={chartData} barSize={8} barGap={1}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9 }}
                interval={5}
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
              <Bar dataKey="sent" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={entry.isBest ? "var(--chart-1)" : "var(--chart-2)"}
                    opacity={entry.isBest ? 1 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
