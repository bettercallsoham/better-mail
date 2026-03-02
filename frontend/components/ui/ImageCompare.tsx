import React from "react";
import { Compare } from "@/components/ui/compare";

export default function CompareDashboard() {
  return (
    <div className="p-4 sm:p-6 gap-6 flex flex-col items-center justify-center pt-10 md:pt-2 md:h-[80vh] rounded-3xl dark:bg-neutral-900 bg-neutral-50 dark:border-neutral-800 w-full">
      {/* Header - responsive for all screen sizes */}
      <div className="w-full max-w-4xl px-2 sm:px-4">
        <h1 className="bg-clip-text text-transparent bg-linear-to-b from-neutral-950 to-neutral-400 dark:from-neutral-50 dark:to-neutral-400 text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-instrument leading-tight">
          You&apos;re Missing an
          <span className="block sm:inline sm:ml-2 font-instrument">
            Amazing Experience
          </span>
        </h1>
        <h3 className="text-neutral-500 dark:text-neutral-400 font-normal tracking-tight leading-tight text-sm sm:text-base md:text-lg mt-3 sm:mt-4 font-sans text-center px-4">
          Advanced Beautiful looking
          <br className="md:hidden" />
          Dashboard Awaiting for you
        </h3>
      </div>

      {/* Compare Component - fully responsive */}
      <div className="w-full  max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] px-2 sm:px-0">
        <Compare
          firstImage="/gmailDashboard.png"
          secondImage="/flowModeDashboard.png"
          firstImageClassName="object-contain object-left-top w-full h-full"
          secondImageClassname="object-contain object-left-top w-full h-full"
          className="w-full h-50 md:h-150 z-10"
          slideMode="hover"
        />
      </div>
    </div>
  );
}
