"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Send, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassmorphicCard } from "./AiChat";
import Image from "next/image";

interface SmartReply {
  id: string;
  text: string;
}

const incomingEmail = {
  from: "Sarah Chen",
  subject: "Quick Question About Q4 Budget",
  preview:
    "Hey! Can you send me the updated Q4 budget breakdown by EOD? Need it for tomorrow's board meeting.",
  time: "2m ago",
};

const smartReplies: SmartReply[] = [
  { id: "1", text: "Sure! I'll send it over in the next hour." },
  { id: "2", text: "On it! You'll have it within 30 minutes." },
  { id: "3", text: "Absolutely! Sending the latest version now." },
];

export function SmartReplies() {
  const [showEmail, setShowEmail] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [customReply, setCustomReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    const emailTimeout = setTimeout(() => setShowEmail(true), 500);
    const repliesTimeout = setTimeout(() => setShowReplies(true), 1200);

    return () => {
      clearTimeout(emailTimeout);
      clearTimeout(repliesTimeout);
    };
  }, []);

  const handleReplyClick = (replyText: string) => {
    setCustomReply(replyText);
  };

  const handleSend = () => {
    if (!customReply.trim()) return;

    setIsSending(true);

    // Simulate sending
    setTimeout(() => {
      setIsSending(false);
      setMessageSent(true);

      // Reset after showing success
      setTimeout(() => {
        setMessageSent(false);
        setCustomReply("");

        // Loop the demo
        setShowEmail(false);
        setShowReplies(false);
        setTimeout(() => {
          setShowEmail(true);
          setTimeout(() => setShowReplies(true), 700);
        }, 500);
      }, 2000);
    }, 800);
  };

  return (
    <div className="absolute  cursor-pointer bottom-10 left-20 hidden lg:flex flex-col z-10 gap-2">
      <h1 className="text-sm text-white font-mono">
        Replying was never this Better.
      </h1>
      <GlassmorphicCard className="w-110 h-75 flex flex-col p-0 overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden px-5 py-3 flex flex-col gap-3 justify-center">
          <AnimatePresence mode="wait">
            {!messageSent ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                {/* Incoming Email */}
                {showEmail && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative p-3 rounded-lg border bg-white/8 border-white/12">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-400/20 to-purple-400/20 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                          <Image
                            src="/abhisharma.webp"
                            width={40}
                            height={40}
                            alt=""
                            className="w-10 rounded-full h-10"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-black font-medium mb-1.5">
                            {incomingEmail.subject}
                          </p>

                          <p className="text-sm text-black leading-relaxed">
                            {incomingEmail.preview}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Smart Replies Section */}
                {showReplies && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {/* Suggested Replies Pills */}
                    <div className="flex gap-1.5">
                      {smartReplies.map((reply, index) => (
                        <motion.button
                          key={reply.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.08 }}
                          onClick={() => handleReplyClick(reply.text)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isSending}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border transition-all duration-200 group relative overflow-hidden",
                            "bg-white/8 border-white/15 hover:bg-white/15 hover:border-purple-400/30",
                            isSending && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex cursor-pointer items-center gap-1.5 relative z-10">
                            <Sparkles className="w-3 h-3 text-purple-300 opacity-70" />
                            <span className="text-xs text-black/70 font-medium">
                              {reply.text}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Custom Input */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="relative"
                    >
                      <input
                        type="text"
                        value={customReply}
                        onChange={(e) => setCustomReply(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={isSending}
                        placeholder="Or type your own reply..."
                        className={cn(
                          "w-full pl-3 pr-12 py-2.5 rounded-lg border transition-all duration-300",
                          "bg-white/8 border-white/15 text-black text-xs",
                          "focus:outline-none focus:ring-1 focus:ring-purple-400/40 focus:bg-white/12",
                          "placeholder:text-black/30",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <motion.button
                          onClick={handleSend}
                          disabled={isSending || !customReply.trim()}
                          whileHover={
                            !isSending && customReply.trim()
                              ? { scale: 1.05 }
                              : {}
                          }
                          whileTap={
                            !isSending && customReply.trim()
                              ? { scale: 0.95 }
                              : {}
                          }
                          className={cn(
                            "p-1.5 rounded-md border transition-all",
                            isSending
                              ? "bg-purple-400/30 border-purple-400/40"
                              : customReply.trim()
                              ? "bg-purple-400/20 border-purple-400/30 hover:bg-purple-400/30"
                              : "bg-white/5 border-white/10 opacity-40 cursor-not-allowed"
                          )}
                        >
                          {isSending ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Send className="w-3.5 cursor-pointer h-3.5 text-purple-400" />
                            </motion.div>
                          ) : (
                            <Send className="w-3.5 h-3.5  cursor-pointer text-black" />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              /* Success Message - Full Screen */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center justify-center h-full"
              >
                <div className="flex flex-col items-center gap-3">
                  {/* Checkmark Circle */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    <div className="w-16 h-16 rounded-full bg-linear-to-br from-green-400/20 to-emerald-400/20 border-2 border-green-400/40 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.3,
                          type: "spring",
                          stiffness: 200,
                        }}
                      >
                        <Check className="w-8 h-8 text-green-400 stroke-3" />
                      </motion.div>
                    </div>

                    {/* Success ring animation */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-green-400"
                    />
                  </motion.div>

                  {/* Success Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center"
                  >
                    <p className="text-sm font-semibold text-black/90 mb-0.5">
                      Message sent successfully
                    </p>
                    <p className="text-[10px] text-black/50">
                      Your reply has been delivered
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/10 relative overflow-hidden">
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
        </div>
      </GlassmorphicCard>
    </div>
  );
}
