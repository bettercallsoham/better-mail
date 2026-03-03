"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponseAnalyticsData } from "@/features/analytics/analytics.type";
import { Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: ResponseAnalyticsData;
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function latencyLabel(minutes: number): { label: string; color: string } {
  if (minutes === 0) return { label: "No data", color: "text-neutral-400" };
  if (minutes <= 30)
    return { label: "Lightning fast", color: "text-emerald-500" };
  if (minutes <= 120) return { label: "Quick", color: "text-emerald-400" };
  if (minutes <= 480) return { label: "Moderate", color: "text-amber-500" };
  return { label: "Slow", color: "text-red-500" };
}

export function ReplyLatencyCard({ data }: Props) {
  const {
    p50MinutesToReply,
    p90MinutesToReply,
    bestSendDayOfWeek,
    bestSendHour,
  } = data;
  const p50Info = latencyLabel(p50MinutesToReply);

  const bestHourDisplay =
    bestSendHour === 0
      ? "12 AM"
      : bestSendHour < 12
        ? `${bestSendHour} AM`
        : bestSendHour === 12
          ? "12 PM"
          : `${bestSendHour - 12} PM`;

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold">
          Reply Latency
        </CardTitle>
        <CardDescription className="text-[12px]">
          How long it typically takes you to reply
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex flex-col gap-4">
        {/* p50 / p90 row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-3">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-neutral-400" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                Typical (p50)
              </span>
            </div>
            <span className="text-[22px] font-semibold text-neutral-900 dark:text-neutral-50 leading-tight tabular-nums">
              {formatMinutes(p50MinutesToReply)}
            </span>
            <span className={cn("text-[11px] font-medium", p50Info.color)}>
              {p50Info.label}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-3">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-neutral-400" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                Worst (p90)
              </span>
            </div>
            <span className="text-[22px] font-semibold text-neutral-900 dark:text-neutral-50 leading-tight tabular-nums">
              {formatMinutes(p90MinutesToReply)}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              9 in 10 replies
            </span>
          </div>
        </div>

        {/* Best time to send */}
        {bestSendDayOfWeek !== "N/A" && (
          <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5">
            <Zap size={14} className="text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                You send most on
              </span>
              <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">
                {bestSendDayOfWeek}s at {bestHourDisplay}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
