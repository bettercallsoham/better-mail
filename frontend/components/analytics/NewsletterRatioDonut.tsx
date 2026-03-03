"use client";

import { LabelList, Pie, PieChart } from "recharts";
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
import { SenderAnalyticsData } from "@/features/analytics/analytics.type";

interface Props {
  data: SenderAnalyticsData;
}

const chartConfig = {
  emails: { label: "Emails" },
  human: { label: "Human", color: "var(--chart-1)" },
  promotions: { label: "Promotions", color: "var(--chart-2)" },
  updates: { label: "Updates", color: "var(--chart-4)" },
  social: { label: "Social", color: "var(--chart-5)" },
} satisfies ChartConfig;

export function NewsletterRatioDonut({ data }: Props) {
  const { categoryBreakdown, totalReceived } = data;
  const isEmpty = totalReceived === 0;

  // Convert percentages to approximate counts for the chart values
  const raw = [
    {
      category: "human",
      label: "Human",
      emails: Math.round((totalReceived * categoryBreakdown.human) / 100),
      fill: "var(--chart-1)",
    },
    {
      category: "promotions",
      label: "Promotions",
      emails: Math.round((totalReceived * categoryBreakdown.promotions) / 100),
      fill: "var(--chart-2)",
    },
    {
      category: "updates",
      label: "Updates",
      emails: Math.round((totalReceived * categoryBreakdown.updates) / 100),
      fill: "var(--chart-4)",
    },
    {
      category: "social",
      label: "Social",
      emails: Math.round((totalReceived * categoryBreakdown.social) / 100),
      fill: "var(--chart-5)",
    },
  ];

  // Only show segments with at least 1 email
  const chartData = raw.filter((d) => d.emails > 0);

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-[15px] font-semibold">
          Inbox Breakdown
        </CardTitle>
        <CardDescription className="text-[12px] text-center">
          {isEmpty
            ? "No emails this period"
            : `${categoryBreakdown.human}% from real people · ${totalReceived.toLocaleString()} total`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {isEmpty ? (
          <div className="flex items-center justify-center h-52 text-[12px] text-neutral-400 dark:text-neutral-500">
            No data for this period
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-55"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="category" hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="emails"
                  nameKey="category"
                  innerRadius={30}
                  cornerRadius={8}
                  paddingAngle={4}
                >
                  <LabelList
                    dataKey="emails"
                    stroke="none"
                    fontSize={12}
                    fontWeight={500}
                    fill="currentColor"
                    formatter={(v: number) => v.toLocaleString()}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {raw.map((item) => (
                <div key={item.category} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: item.fill }}
                  />
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.label}
                    {item.emails > 0 && (
                      <span className="ml-1 text-neutral-400 dark:text-neutral-500">
                        (
                        {
                          categoryBreakdown[
                            item.category as keyof typeof categoryBreakdown
                          ]
                        }
                        %)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
