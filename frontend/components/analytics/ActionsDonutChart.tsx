"use client";

import { Pie, PieChart, Cell } from "recharts";
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
import { AnalyticsMetrics } from "@/features/analytics/analytics.type";

interface Props {
  metrics: AnalyticsMetrics;
}

const chartConfig = {
  archived: { label: "Archived", color: "var(--chart-2)" },
  done: { label: "Done", color: "var(--chart-1)" },
  starred: { label: "Starred", color: "var(--chart-4)" },
  deleted: { label: "Deleted", color: "var(--chart-5)" },
  unhandled: { label: "Unhandled", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ActionsDonutChart({ metrics }: Props) {
  const handled = metrics.archived + metrics.deleted + metrics.starred;
  const unhandled = Math.max(0, metrics.received - handled);

  const chartData = [
    { name: "archived", value: metrics.archived },
    { name: "starred", value: metrics.starred },
    { name: "deleted", value: metrics.deleted },
    { name: "unhandled", value: unhandled },
  ].filter((d) => d.value > 0);

  const handledPct =
    metrics.received > 0 ? Math.round((handled / metrics.received) * 100) : 0;

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold">
          Inbox Actions
        </CardTitle>
        <CardDescription className="text-[12px]">
          {handledPct}% of received emails actioned
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-2">
        <ChartContainer config={chartConfig} className="aspect-square max-h-50">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              strokeWidth={2}
              stroke="transparent"
              paddingAngle={3}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={`var(--color-${entry.name})`}
                  fillOpacity={0.85}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {/* Simple legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: `var(--color-${entry.name})` }}
              />
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 capitalize">
                {chartConfig[entry.name as keyof typeof chartConfig]?.label ??
                  entry.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
