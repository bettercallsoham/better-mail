import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmailChatDemo, GlassmorphicCard } from "./AiChat";
import { MultiAccountSwitcher } from "./MultiAccountSwitcher";

export default function HeroSection() {
  return (
    <section className="relative w-full h-[80vh] md-h-screen lg:h-[120vh] overflow-hidden">
      <Image
        src="/bg-avatar.png"
        alt="Hero background"
        fill
        quality={100}
        priority
        className="object-cover object-center"
      />

      <div
        className="absolute  inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.1)_1px,transparent_1px)]"
        style={{
          backgroundSize: "50px 50px",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, transparent 50%)",
        }}
      />

      <div className=" relative z-10 container mx-auto px-4 min-w-[99vw] sm:px-6 lg:px-8 min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0  min-h-screen items-start pt-35 md:pt-24">
          <div className="hidden lg:flex lg:col-span-3 xl:col-span-3 items-start pt-100 left-0">
            <EmailChatDemo />
          </div>

          <div className="lg:col-span-6 max-w-4xl xl:col-span-6 flex flex-col items-center justify-center text-center space-y-2  py-2 md:py-16">
            {/* Main Heading */}
            <h1 className="relative z-20">
              <span className=" text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold font-sans tracking-tight text-white drop-shadow-lg leading-tight">
                Read Less & Do More with
              </span>
              <span className=" ml-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-instrument italic text-white drop-shadow-lg ">
                Better Mail
              </span>
            </h1>

            {/* Subtitle */}
            <p className="relative z-20 text-muted text-sm md:text-xl font-medium  drop-shadow-md max-w-sm md:max-w-xl lg:max-w-2xl px-4 leading-relaxed">
              AI sorts and prioritizes your inbox for better focus.
            </p>

            {/* CTA Button */}
            <div className="relative z-20 pt-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl text-base md:text-lg font-semibold hover:bg-gray-900 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-1 active:translate-y-0 border border-white/10"
              >
                <span>Try for Free</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column: App Integrations & Multi-Account (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-3 xl:col-span-3 flex-col gap-30 mt-40">
            {/* App Integrations Card */}
            <div className="space-y-3 ">
              <h2 className="text-sm text-white/90 font-mono font-medium">
                Connect All Your apps
              </h2>
              <GlassmorphicCard className="flex w-105  xl:gap-12 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-xl p-5 transition-all duration-300 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl items-center justify-center gap-50 ">
                <Image
                  height={40}
                  width={40}
                  className="w-10 h-10"
                  src="/slackIcon.svg"
                  alt="Slack"
                />
                <Image
                  height={40}
                  width={40}
                  className="w-10 h-10"
                  src="/telegramIcon.svg"
                  alt="Telegram"
                />
                <Image
                  height={40}
                  width={40}
                  className="w-10 h-10"
                  src="/notionIcon.svg"
                  alt="Notion"
                />
                <Image
                  height={40}
                  width={40}
                  className="w-10 h-10"
                  src="/meetIcon.svg"
                  alt="Telegram"
                />
              </GlassmorphicCard>
            </div>

            {/* Multi-Account Switcher */}
            <MultiAccountSwitcher />
          </div>
        </div>
      </div>
    </section>
  );
}
