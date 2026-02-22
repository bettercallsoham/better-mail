"use client";

import DisplayCards from "@/components/ui/display-cards";
import { Mail, Star, Zap } from "lucide-react";

const defaultCards = [
  {
    icon: <Star className="size-4 text-yellow-300" />,
    title: "Important",
    description: "Meeting at 3 PM - Q4 Review",
    date: "Just now",
    iconClassName: "text-yellow-400",
    titleClassName: "text-yellow-300",
    className:
      "[grid-area:stack] hover:-translate-y-10 hover:scale-[1.02] before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-yellow-500/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
  },
  {
    icon: <Mail className="size-4 text-blue-300" />,
    title: "Inbox",
    description: "Project update from Sarah",
    date: "2 mins ago",
    iconClassName: "text-blue-400",
    titleClassName: "text-blue-300",
    className:
      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 hover:scale-[1.02] before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-blue-500/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
  },
  {
    icon: <Zap className="size-4 text-purple-300" />,
    title: "Updates",
    description: "New feature deployed!",
    date: "5 mins ago",
    iconClassName: "text-purple-400",
    titleClassName: "text-purple-300",
    className:
      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10 hover:scale-[1.02] before:absolute before:w-[100%] before:rounded-xl before:h-[100%] before:content-[''] before:bg-gradient-to-br before:from-purple-500/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700 before:left-0 before:top-0 before:pointer-events-none",
  },
];

function DisplayEmailCards() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center py-20">
      <div className="w-full max-w-3xl">
        <DisplayCards cards={defaultCards} />
      </div>
    </div>
  );
}

export { DisplayEmailCards };
