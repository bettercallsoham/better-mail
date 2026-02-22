"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Star,
  ChevronRight,
  Sparkles,
  Clock,
  Paperclip,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassmorphicCard } from "./AiChat";
import Image from "next/image";

interface Email {
  id: string;
  sender: string;
  senderAvatar: string;
  subject: string;
  preview: string;
  time: string;
  isUnread: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  priority: "high" | "normal" | "low";
}

interface EmailAccount {
  id: string;
  email: string;
  provider: "gmail" | "outlook" | "yahoo";
  unread: number;
  avatar: string;
  isActive: boolean;
  emails: Email[];
}

const accounts: EmailAccount[] = [
  {
    id: "1",
    email: "abhi@bettermail.tech",
    provider: "gmail",
    unread: 3,
    avatar: "/gmailIcon.svg",
    isActive: true,
    emails: [
      {
        id: "e1",
        sender: "Abhi Sharma",
        senderAvatar: "/abhisharma.webp",
        subject: "You Really Cooked with Bettermail ",
        preview: "Hey abhi , the new bettermail is f**king crazyy.",
        time: "2m ago",
        isUnread: true,
        isStarred: true,
        hasAttachment: true,
        priority: "normal",
      },
      {
        id: "e2",
        sender: "Sundar Ladki",
        senderAvatar: "/sundarLadki.png",
        subject: "Ditching gmail for bettermail Todayy!",
        preview: "Bettermail is soooooooo gooooood , i can't stop using it....",
        time: "1h ago",
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        priority: "high",
      },
      {
        id: "e3",
        sender: "Manu Paaji",
        senderAvatar: "/manuPaaji.png",
        subject: "Kamaal kardeta veere !! ",
        preview: "Raat nu peg weg daa plan banjau teh mazaaa aaajau veere !",
        time: "3h ago",
        isUnread: false,
        isStarred: true,
        hasAttachment: false,
        priority: "normal",
      },
    ],
  },
  {
    id: "2",
    email: "abhi.sharma@outlook.com",
    provider: "outlook",
    unread: 2,
    avatar: "/outlookIcon.svg",
    isActive: false,
    emails: [
      {
        id: "e4",
        sender: "BetterMail.tech",
        senderAvatar: "/abhisharma.webp",
        subject: "Meeting recap: System Design",
        preview: "Production mein kab jayega ? ",
        time: "30m ago",
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        priority: "normal",
      },
      {
        id: "e5",
        sender: "Kaustabh Wadhwa",
        senderAvatar: "/logo.png",
        subject: "It was a good run.",
        preview: "Unfortunately we've to let you go ",
        time: "2h ago",
        isUnread: false,
        isStarred: true,
        hasAttachment: false,
        priority: "high",
      },
    ],
  },
  {
    id: "3",
    email: "abhi@yahoo.com",
    provider: "yahoo",
    unread: 0,
    avatar: "/yahooIcon.svg",
    isActive: false,
    emails: [],
  },
];

export function MultiAccountSwitcher() {
  const [activeAccount, setActiveAccount] = useState("1");
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);

  return (
    <div className="  hidden xl:flex cursor-pointer bottom-2 right-10  flex-col  z-10 gap-2 ">
      <h1 className="text-sm text-white font-mono">
        Your inbox was never this clean.
      </h1>
      <GlassmorphicCard className=" w-105 h-125 flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-9 h-9 rounded-xl bg-linear-to-br flex items-center justify-center backdrop-blur-sm border border-white/20 overflow-hidden"
              >
                <Image
                  className="rounded-full"
                  src="/abhisharma.webp"
                  height={36}
                  width={36}
                  alt=""
                />
              </motion.div>
              <div>
                <h3 className="text-black font-semibold text-sm">Hey Abhi</h3>
                <p className="text-black/50 text-xs">Your Unified Inbox</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <Tabs
          value={activeAccount}
          onValueChange={setActiveAccount}
          className="flex-1 flex flex-col"
        >
          {/* Tab List */}
          <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0 gap-0">
            {accounts.map((account) => (
              <TabsTrigger
                key={account.id}
                value={account.id}
                className={cn(
                  "flex-1 rounded-none border-b-2 transition-all duration-300 data-[state=active]:bg-transparent",
                  "data-[state=active]:border-blue-400/60 data-[state=inactive]:border-transparent",
                  "hover:bg-white/5 py-3 px-4 relative overflow-hidden group"
                )}
              >
                <div className="relative flex items-center gap-2 justify-center">
                  <Image
                    width={16}
                    height={16}
                    src={account.avatar}
                    alt=""
                    className="object-contain"
                  />
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      activeAccount === account.id
                        ? "text-black"
                        : "text-black/50"
                    )}
                  >
                    {account.provider.charAt(0).toUpperCase() +
                      account.provider.slice(1)}
                  </span>
                  {account.unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-0 -right-5 bg-white/10 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      {account.unread}
                    </motion.span>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content - Email List */}
          <div className="flex-1 overflow-hidden">
            {accounts.map((account) => (
              <TabsContent
                key={account.id}
                value={account.id}
                className="h-full m-0 p-4 data-[state=inactive]:hidden overflow-y-auto"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {account.emails.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-100 text-center"
                      >
                        <Mail className="w-12 h-12 text-black/20 mb-3" />
                        <p className="text-black/60 text-sm font-medium">
                          All caught up!
                        </p>
                        <p className="text-black/40 text-xs mt-1">
                          No new emails in this inbox
                        </p>
                      </motion.div>
                    ) : (
                      account.emails.map((email, index) => (
                        <motion.div
                          key={email.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onHoverStart={() => setHoveredEmail(email.id)}
                          onHoverEnd={() => setHoveredEmail(null)}
                          whileHover={{ x: 4 }}
                          className={cn(
                            "relative group p-3 rounded-xl border transition-all duration-300 cursor-pointer",
                            email.isUnread
                              ? "bg-white/15 border-white/20 hover:bg-white/25"
                              : "bg-white/5 border-white/10 hover:bg-white/15",
                            hoveredEmail === email.id && "shadow-lg"
                          )}
                        >
                          {/* Priority indicator */}
                          {email.priority === "high" && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-red-500 to-orange-500 rounded-l-xl"
                            />
                          )}

                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400/20 to-purple-400/20 border border-white/20 flex items-center justify-center overflow-hidden">
                                <Image
                                  src={email.senderAvatar}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                />
                              </div>
                              {email.isUnread && (
                                <CircleDot className="absolute -top-1 -right-1 w-3 h-3 text-blue-400 fill-blue-400" />
                              )}
                            </div>

                            {/* Email Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span
                                  className={cn(
                                    "text-sm font-medium truncate",
                                    email.isUnread
                                      ? "text-black"
                                      : "text-black/70"
                                  )}
                                >
                                  {email.sender}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {email.hasAttachment && (
                                    <Paperclip className="w-3 h-3 text-black/40" />
                                  )}
                                  {email.isStarred && (
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  )}
                                </div>
                              </div>

                              <h4
                                className={cn(
                                  "text-xs mb-1 truncate",
                                  email.isUnread
                                    ? "text-black font-medium"
                                    : "text-black/60"
                                )}
                              >
                                {email.subject}
                              </h4>

                              <p className="text-xs text-black/50 truncate mb-2">
                                {email.preview}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[10px] text-black/40">
                                  <Clock className="w-3 h-3" />
                                  <span>{email.time}</span>
                                </div>

                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{
                                    opacity: hoveredEmail === email.id ? 1 : 0,
                                    x: hoveredEmail === email.id ? 0 : -10,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="w-4 h-4 text-black/30" />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          {/* Hover effect overlay */}
                          <motion.div
                            initial={false}
                            animate={{
                              opacity: hoveredEmail === email.id ? 0.05 : 0,
                            }}
                            className="absolute inset-0 bg-linear-to-r from-blue-400 to-purple-400 rounded-xl pointer-events-none"
                          />
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 relative overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2,
            }}
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
          />
          <div className="flex items-center justify-center gap-2 relative">
            <Sparkles className="w-3 h-3 text-blue-300" />
            <p className="text-black/40 text-xs">
              AI-powered inbox ·{" "}
              <span className="text-blue-300 font-semibold">Live sync</span>
            </p>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
