"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InboxHealthData } from "@/features/analytics/analytics.type";
import { cn } from "@/lib/utils";

interface Props {
  data: InboxHealthData;
}

const STATE_LABELS: Record<string, string> = {
  INBOX: "Inbox",
  DONE: "Done",
  ARCHIVED: "Archived",
  SNOOZED: "Snoozed",
};

const STATE_COLORS: Record<string, string> = {
  INBOX: "bg-blue-500",
  DONE: "bg-emerald-500",
  ARCHIVED: "bg-violet-500",
  SNOOZED: "bg-amber-400",
};

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

// Thin SVG arc ring
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      className="block"
      aria-label={`Score ${score}`}
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-neutral-100 dark:text-neutral-800"
      />
      {/* Fill */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeLinecap="round"
        strokeDashoffset={circumference * 0.25} /* start at 12 o'clock */
        className={cn(
          "transition-all duration-700",
          score >= 70
            ? "text-emerald-500"
            : score >= 40
              ? "text-amber-500"
              : "text-red-500",
        )}
        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
      />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        className="fill-neutral-900 dark:fill-neutral-50"
        fontSize="22"
        fontWeight="600"
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}

export function InboxHealthScore({ data }: Props) {
  const { score, stateDistribution, abandonedDrafts } = data;
  const total = Object.values(stateDistribution).reduce((a, b) => a + b, 0);

  const stateOrder = ["DONE", "ARCHIVED", "INBOX", "SNOOZED"];

  return (
    <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold">
              Inbox Health
            </CardTitle>
            <CardDescription className="text-[12px]">
              Based on how you action incoming emails
            </CardDescription>
          </div>
          {abandonedDrafts > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              {abandonedDrafts} unsent draft{abandonedDrafts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-4">
        {/* Ring */}
        <div className="relative flex flex-col items-center">
          <ScoreRing score={score} />
          <span
            className={cn("text-[12px] font-medium -mt-1", scoreColor(score))}
          >
            {scoreLabel(score)}
          </span>
        </div>

        {/* State distribution bars */}
        {total > 0 && (
          <div className="w-full flex flex-col gap-1.5">
            {stateOrder
              .filter((s) => stateDistribution[s] !== undefined)
              .map((state) => {
                const count = stateDistribution[state] ?? 0;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={state} className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 w-16 shrink-0">
                      {STATE_LABELS[state] ?? state}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          STATE_COLORS[state] ?? "bg-neutral-400",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-neutral-400 w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
