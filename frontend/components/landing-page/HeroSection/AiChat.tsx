"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const GlassmorphicCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg transition-all duration-300",
      className,
    )}
  >
    {children}
  </div>
);

const funnyBotResponses = [
  "Stop it Bro!!!. Signup and use real one :) ",
  "Yeah Yeah , as if i care, i am just a bot : ) ",
  "Told yaa buddy ! use the real one ",
  "No , do it yourself !",
  "Comeon Buddy , Do some Real Stuffs",
];

export function EmailChatDemo() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "List all the important emails for today",
      isUser: true,
      timestamp: new Date(),
    },
    {
      id: "2",
      text: "Nah ! Do it yourself.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 2) {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: crypto.randomUUID(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(
      () => {
        const botMessage = {
          id: crypto.randomUUID(),
          text: funnyBotResponses[
            Math.floor(Math.random() * funnyBotResponses.length)
          ],
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
      },
      1000 + Math.random() * 500,
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-md lg:max-w-none mx-auto">
      <span className="text-sm text-white/80 font-mono">
        Use AI to automate your tasks.
      </span>

      <GlassmorphicCard className="w-full lg:w-105 h-87.5 flex  flex-col p-0 overflow-hidden">
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5 z-10">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-neutral-800" />
          </div>
          <div className="flex-1">
            <h3 className="text-black font-semibold text-sm">
              Better AI Assistant
            </h3>
            <p className="text-black/50 text-[11px]">Your new Email Copilot</p>
          </div>
        </div>

        {/* Scrollable Container - Fixed for long conversations */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 space-y-4 no-scrollbar scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {isTyping && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>

        {/* Fixed Input Area */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-white/5 ">
          <div className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2 border border-white/10 focus-within:border-blue-400/50 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your emails..."
              className="flex-1 bg-transparent text-sm text-black placeholder:text-black/30 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                "p-2 rounded-lg bg-blue-600 hover:bg-blue-500 shadow-md transition-all active:scale-90",
                "disabled:opacity-20 disabled:grayscale",
              )}
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-center ${
        message.isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!message.isUser && (
        <Image
          src="/logo.png"
          className="h-8 w-8 mr-2 bg-neutral-300/20 rounded-2xl"
          width={100}
          height={100}
          alt=""
        />
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          message.isUser
            ? "bg-blue-500/30 text-black border border-blue-400/30"
            : "bg-white/10 text-black/90 border border-white/10"
        }`}
      >
        <p className="text-sm leading-relaxed">{message.text}</p>
        <p className="text-[10px] text-black/40 mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {message.isUser && (
        <Image
          src="/abhisharma.webp"
          className="h-8 w-8 ml-2 bg-neutral-300/20 rounded-2xl"
          width={100}
          height={100}
          alt=""
        />
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start items-center gap-2 ml-9"
    >
      <div className="bg-white/40 border border-white/10 rounded-full px-3 py-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-1 h-1 rounded-full bg-black/40"
          />
        ))}
      </div>
    </motion.div>
  );
}
