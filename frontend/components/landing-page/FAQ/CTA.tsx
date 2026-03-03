"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CTASection() {
  return (
    <section className="relative w-full py-20  md:py-32 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden">
      {/* Background Grid */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)]"
        style={{
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)",
        }}
      />

      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 h-[60vh] relative z-10">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Left Side - Orbiting Circles */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative flex-1 flex items-center mb-20 lg:mb-0 justify-center order-2 lg:order-1"
          >
            <div className="relative w-full max-w-[300px] md:max-w-md aspect-square flex items-center justify-center">
              {/* Center Logo */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-3 md:p-4 shadow-2xl flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    width={80}
                    height={80}
                    alt="Bettermail"
                    className="w-full invert h-full"
                  />
                </div>
              </motion.div>

              {/* Orbiting Icons - Inner Circle */}
              <OrbitingCircles
                className="size-[35px] md:size-[40px] border-none bg-white shadow-lg rounded-full"
                duration={20}
                radius={110}
                iconSize={35}
              >
                <Image
                  src="/gmailIcon.svg"
                  width={20}
                  height={20}
                  alt="Gmail"
                  className="w-5 h-5"
                />
                <Image
                  src="/outlookIcon.svg"
                  width={20}
                  height={20}
                  alt="Outlook"
                  className="w-5 h-5"
                />
                <Image
                  src="/logo.png"
                  width={20}
                  height={20}
                  alt="Yahoo"
                  className="w-5 h-5"
                />
              </OrbitingCircles>

              {/* Orbiting Icons - Outer Circle */}
              <OrbitingCircles
                className="size-[45px] md:size-[50px] border-none bg-white shadow-lg rounded-full"
                duration={30}
                radius={200}
                iconSize={45}
                reverse
              >
                <Image
                  src="/notionIcon.svg"
                  width={24}
                  height={24}
                  alt="Notion"
                  className="w-6 h-6"
                />
                <Image
                  src="/slackIcon.svg"
                  width={24}
                  height={24}
                  alt="Slack"
                  className="w-6 h-6"
                />
                <Image
                  src="/telegramIcon.svg"
                  width={24}
                  height={24}
                  alt="Telegram"
                  className="w-6 h-6"
                />
                <Image
                  src="/meetIcon.svg"
                  width={24}
                  height={24}
                  alt="Google Meet"
                  className="w-6 h-6"
                />
              </OrbitingCircles>
            </div>
          </motion.div>

          {/* Right Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex-1 text-center lg:text-left max-w-2xl order-1 lg:order-2"
          >
            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-3xl font-instrument sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl bg-clip-text text-neutral-900 mb-4 md:mb-6 leading-tight"
            >
              Connect your Email <br className="hidden sm:block" /> and Start
              Automating
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-base md:text-lg lg:text-xl text-neutral-600 mb-6 md:mb-8 leading-relaxed px-4 lg:px-0"
            >
              Integrate with your favorite tools and let AI handle your email
              workflows. Save hours every week with intelligent automation.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true }}
              className="flex justify-center lg:justify-start"
            >
              <Link
                href="/signup"
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl text-base md:text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                  "bg-black/90 text-white hover:bg-black border border-white/20",
                )}
              >
                <span>Start using for free</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
