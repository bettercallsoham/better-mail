
"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";


export function DashboardSection() {
  return (
    <div className="bg-neutral-50 lg:py-12 ">
      
      <h1 className=" bg-clip-text text-transparent bg-linear-to-b from-neutral-950 to-neutral-400 lg:block mt-6 text-center px-6 text-3xl md:text-5xl font-instrument py-2">
        Email That
        <span className="block md:inline md:ml-2 font-instrument">
          Works for You.
        </span>
      </h1>
      <h3 className="text-neutral-400 font-sans text-md md:mb-10 text-center">
        Not the other way around
      </h3>
      <div className="w-full h-full  bg-neutral-50 max-w-8xl bg-[radial-gradient(circle,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-size-[20px_20px] flex flex-col lg:flex-row items-center justify-center ">
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden w-full h-full px-10 py-10",
          )}
        >
          <div className="relative w-full h-full z-10 aspect-video rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
            <Image
              className="h-full w-full  object-contain"
              fill
              src="/dashboardImage.png"
              alt="Dashboard preview"
              priority
              quality={95}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
