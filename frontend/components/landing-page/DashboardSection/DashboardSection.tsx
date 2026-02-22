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

  const features = [
    {
      icon: Inbox,
      title: "Unified Inbox Experience",
      description:
        "Connect multiple email accounts and manage them seamlessly in one powerful interface with real-time synchronization",
      color: "text-black",
      bgColor: "bg-transparent",
      hoverColor: "group-hover:text-blue-400",
    },
    {
      icon: Brain,
      title: "AI-Powered Intelligence",
      description:
        "Smart categorization, priority detection, and automated responses powered by advanced AI to handle your emails efficiently",
      color: "text-black",
      bgColor: "bg-transparent",
      hoverColor: "group-hover:text-red-500",
      highlighted: false,
    },
    {
      icon: Workflow,
      title: "Custom Workflows",
      description:
        "Build automated email workflows with drag-and-drop simplicity to streamline your communication and boost productivity",
      color: "text-black",
      bgColor: "bg-orange-50",
      hoverColor: "group-hover:text-orange-700",
    },
  ];

  return (
    <div className="bg-neutral-50 lg:py-12 ">
      <h1 className=" bg-clip-text text-transparent bg-linear-to-b from-neutral-950 to-neutral-400 lg:block mt-6 text-center px-6 text-3xl md:text-5xl font-instrument py-5">
        You Deserve
        <span className="block md:inline md:ml-2 font-instrument">
          Better Dashboard
        </span>
      </h1>
      <h3 className="text-neutral-400 font-sans text-md md:mb-10 text-center">Advanced Beautiful looking 
        <br className="md:hidden"/> Dashboard Awaiting for you </h3>
      <div className="w-full  bg-neutral-50 max-w-8xl bg-[radial-gradient(circle,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-size-[20px_20px] flex flex-col lg:flex-row items-center justify-center ">
      
        {/* Dashboard Preview - Order 2 on mobile, right side on desktop */}
        <Magnetic
          intensity={0.6}
          springOptions={springOptions}
          actionArea="global"
          range={500}
          className="w-full order-2 lg:order-none"
        >
          <div
            className={cn(
              "relative rounded-2xl overflow-hidden max-w-7xl",
              "dark:bg-zinc-900 dark:border-zinc-800"
            )}
          >
            <div className="p-6">
              <Magnetic
                intensity={0.15}
                springOptions={springOptions}
                actionArea="global"
                range={200}
              >
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
              </Magnetic>
            </div>
          </div>
        </Magnetic>

        <div className="flex flex-col bg-neutral-50 lg:border-r-2 border-neutral-200 w-full lg:w-auto order-3 lg:order-first">
          <div className="flex flex-col divide-y divide-neutral-200 lg:mt-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    x: 4,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                  }}
                  className={cn(
                    "group px-6  py-6 cursor-pointer transition-colors duration-300",
                    feature.highlighted ? "bg-neutral-100/80" : "bg-neutral-50"
                  )}
                >
                  <div className="flex relative items-start gap-4">
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 5,
                        transition: {
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }}
                      className={cn(
                        "flex-shrink-0 p-2.5 rounded-lg transition-colors duration-300",
                        feature.bgColor
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-colors duration-300",
                          feature.color,
                          feature.hoverColor
                        )}
                      />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "text-lg font-semibold mb-2 transition-colors duration-300",
                          feature.highlighted
                            ? "text-neutral-900 group-hover:text-neutral-950"
                            : "text-neutral-800 group-hover:text-neutral-900"
                        )}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-sm text-neutral-600 group-hover:text-neutral-700 leading-relaxed transition-colors duration-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
