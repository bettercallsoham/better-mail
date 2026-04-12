"use client";

import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

interface TipBtnProps {
  onClick?:  () => void;
  tip:       string;
  kbd?:      string;
  className?: string;
  disabled?: boolean;
  active?:   boolean;
  children:  React.ReactNode;
}

export function TipBtn({ onClick, tip, kbd, className, disabled, active, children }: TipBtnProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "w-8 h-8 flex cursor-pointer items-center justify-center rounded-xl transition-all duration-100",
              "text-gray-400 dark:text-white/28",
              "hover:text-gray-700 dark:hover:text-white/65 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]",
              "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              active && "bg-black/[0.05] dark:bg-white/[0.09] text-gray-700 dark:text-white/65",
              className,
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-1.5">
          <span className="text-[11px]">{tip}</span>
          {kbd && <Kbd className="text-[9px] font-mono px-1 py-px rounded">{kbd}</Kbd>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}