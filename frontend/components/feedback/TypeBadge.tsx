import { Lightbulb, Bug, Sparkles, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackPostType } from "@/features/feedback/feedback.type";

const TYPE_CONFIG: Record<
  FeedbackPostType,
  { label: string; icon: React.ReactNode }
> = {
  feature_request: {
    label: "Feature",
    icon: <Lightbulb size={11} strokeWidth={1.5} />,
  },
  bug_report: {
    label: "Bug",
    icon: <Bug size={11} strokeWidth={1.5} />,
  },
  improvement: {
    label: "Improvement",
    icon: <Sparkles size={11} strokeWidth={1.5} />,
  },
  question: {
    label: "Question",
    icon: <HelpCircle size={11} strokeWidth={1.5} />,
  },
};

// One subtle accent color per type — just the text/icon, no bg noise
const TYPE_COLOR: Record<FeedbackPostType, string> = {
  feature_request: "text-blue-500 dark:text-blue-400",
  bug_report:      "text-rose-500 dark:text-rose-400",
  improvement:     "text-amber-500 dark:text-amber-400",
  question:        "text-violet-500 dark:text-violet-400",
};

export function TypeBadge({ type }: { type: FeedbackPostType }) {
  const { label, icon } = TYPE_CONFIG[type];
  return (
    <></>
    // <span
    //   className={cn(
    //     "inline-flex items-center gap-1 text-[11px] font-medium",
    //     TYPE_COLOR[type],
    //   )}
    // >
    //   {/* {icon}
    //   {label} */}
    // </span>
  );
}