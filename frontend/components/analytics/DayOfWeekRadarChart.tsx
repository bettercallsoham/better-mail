"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
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
import { Badge } from "@/components/ui/badge";
import { TimePatternsData } from "@/features/analytics/analytics.type";

interface Props {
  data: TimePatternsData;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const chartConfig = {
  emails: {
    label: "Emails",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DayOfWeekRadarChart({ data }: Props) {
  const chartData = DAYS.map((day) => ({
    day: day.slice(0, 3),
    emails: data.dailyDistribution[day] ?? 0,
  }));

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="items-start pb-2">
        <div className="flex w-full items-center justify-between">
          <CardTitle className="text-[15px] font-semibold">
            Day of Week
          </CardTitle>
          <div className="flex gap-1.5">
            {data.busiestDay && (
              <Badge
                variant="secondary"
                className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none"
              >
                🔥 {data.busiestDay.slice(0, 3)}
              </Badge>
            )}
            {data.quietestDay && (
              <Badge
                variant="secondary"
                className="text-[11px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-none"
              >
                😌 {data.quietestDay.slice(0, 3)}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-[12px]">
          Distribution across the week
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-52"
        >
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="day" tick={{ fontSize: 11 }} />
            <PolarGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <defs>
              <linearGradient id="day-radar-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-emails)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-emails)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <Radar
              dataKey="emails"
              stroke="var(--color-emails)"
              fill="url(#day-radar-fill)"
              fillOpacity={1}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
