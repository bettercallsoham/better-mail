"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SenderAnalyticsData } from "@/features/analytics/analytics.type";
import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: SenderAnalyticsData;
}

export function TopSendersTable({ data }: Props) {
  const { topSenders } = data;
  const maxVolume = Math.max(...topSenders.map((s) => s.volume), 1);

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold">Top Senders</CardTitle>
        <CardDescription className="text-[12px]">
          Who fills your inbox — and who you actually read
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        {topSenders.length === 0 ? (
          <p className="text-[12px] text-neutral-400 dark:text-neutral-500 py-4 text-center">
            No data for this period
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {topSenders.slice(0, 8).map((sender) => (
              <li key={sender.email} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-200 truncate">
                      {sender.name ?? sender.email}
                    </span>
                    {sender.name && (
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate hidden sm:block">
                        {sender.email}
                      </span>
                    )}
                    {sender.hasAttachments && (
                      <Paperclip
                        size={10}
                        className="text-neutral-400 dark:text-neutral-500 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        sender.readRate >= 70
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : sender.readRate >= 40
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-red-500/10 text-red-500 dark:text-red-400",
                      )}
                    >
                      {sender.readRate}% read
                    </span>
                    <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500 w-8 text-right">
                      {sender.volume}
                    </span>
                  </div>
                </div>
                {/* Volume bar */}
                <div className="h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-neutral-300 dark:bg-neutral-600 transition-all duration-500"
                    style={{
                      width: `${Math.round((sender.volume / maxVolume) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
