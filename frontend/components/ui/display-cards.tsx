"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        // Glassmorphism base
        "relative flex h-36 w-88 -skew-y-[8deg] select-none flex-col justify-between rounded-xl",
        // Glass effect with backdrop blur
        "bg-white/10 backdrop-blur-md",
        // Premium border with subtle gradient
        "border border-white/20",
        // Shadow for depth
        "shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]",
        // Hover states
        "transition-all duration-700 hover:bg-white/15 hover:border-white/30 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.25)]",
        // Padding
        "px-4 py-3",
        // Fade overlay on right
        "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-linear-to-l after:from-background/80 after:to-transparent after:content-[''] after:pointer-events-none",
        // Layout
        "*:flex *:items-center *:gap-2",
        className
      )}
    >
      <div>
        <span className="relative inline-block rounded-full bg-blue-500/20 backdrop-blur-sm p-1 border border-blue-300/30">
          {icon}
        </span>
        <p className={cn("text-lg font-medium text-white/90", titleClassName)}>
          {title}
        </p>
      </div>
      <p className="whitespace-nowrap text-lg text-white/80">{description}</p>
      <p className="text-white/50 text-sm">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
    },
    {
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
    },
    {
      className:
        "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10 before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
