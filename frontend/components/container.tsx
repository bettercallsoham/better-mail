import React from "react";
import { cn } from "@/lib/utils";
type ContainerWrapProps = {
  children: React.ReactNode;
  className?: string;
};

export function ContainerWrap({
  children,
  className = "",
}: ContainerWrapProps) {
  return (
    <div
      className={cn(
        "flex items-center md:px-10 lg:px-30 justify-center lg:min-h-screen bg-neutral-100 lg:py-12",
        className,
      )}
    >
      <div className="w-full max-w-8xl">{children}</div>
    </div>
  );
}
