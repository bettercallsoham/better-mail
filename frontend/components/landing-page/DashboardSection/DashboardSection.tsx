"use client";

import { Magnetic } from "@/components/ui/magnetic";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Brain, Inbox, Workflow } from "lucide-react";
import { motion } from "motion/react";
import { BorderBeam } from "../../ui/border-beam";
// import GridShowcase from "./TechStackGrid";

export function DashboardSection() {
  const springOptions = { bounce: 0.1 };

  return (
    <div className="bg-neutral-50 lg:py-12 ">
      <h1 className=" bg-clip-text text-transparent bg-linear-to-b from-neutral-950 to-neutral-400 lg:block mt-6 text-center px-6 text-3xl md:text-5xl font-instrument py-5">
        You Deserve
        <span className="block md:inline md:ml-2 font-instrument">
          Better Dashboard
        </span>
      </h1>
      <h3 className="text-neutral-400 font-sans text-md md:mb-10 text-center">
        Advanced Beautiful looking
        <br className="md:hidden" /> Dashboard Awaiting for you{" "}
      </h3>
      <div className="w-full  bg-neutral-50 max-w-8xl bg-[radial-gradient(circle,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-size-[20px_20px] flex flex-col lg:flex-row items-center justify-center ">
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden max-w-7xl",
            "dark:bg-zinc-900 dark:border-zinc-800",
          )}
        >
          <div className="p-6">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
              <Image
                className="shadow-[0_1px_4px_rgba(0,0,0,0.16)] object-contain object-top"
                fill
                src="/dashboardImage.png"
                alt="Dashboard preview"
                priority
                quality={95}
              />
              <BorderBeam duration={20} size={100} />
            </div>
          </div>
        </div>

       
      </div>
    </div>
  );
}
