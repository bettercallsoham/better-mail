"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconArrowLeft,
  IconMessageCirclePlus,
  IconX,
  IconMenu2,
} from "@tabler/icons-react";
import { useAIStore } from "@/lib/store/ui.store";
import {
  useCreateConversation,
  useCreateMessage,
} from "@/features/conversations/conversations.query";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import { AIInput } from "./AIInput";
import { useStreamingMessage } from "@/lib/store/conversations.store";
import { cn } from "@/lib/utils";

export function AIAssistantFullscreen() {
  const {
    activeAIConversationId,
    setAIMode,
    setActiveAIConversationId,
    setAIAssistantOpen,
  } = useAIStore();

  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { mutate: createConversation, isPending: creating } =
    useCreateConversation();
  const { mutate: sendMessage, isPending: sending } = useCreateMessage();
  const streamingState = useStreamingMessage(
    activeAIConversationId ?? "__none__",
  );
  const isStreaming = !!streamingState?.isStreaming;

  const handleSubmit = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");

    if (!activeAIConversationId) {
      createConversation(undefined, {
        onSuccess: (res) => {
          setActiveAIConversationId(res.conversationId);
          setTimeout(() => sendMessage({ conversationId: res.conversationId, content }), 300);
        },
      });
    } else {
      sendMessage({ conversationId: activeAIConversationId, content });
    }
  };

  const handleBack = () => {
    setAIMode(false);
    setAIAssistantOpen(false);
  };

  const handleNewConversation = () =>
    createConversation(undefined, {
      onSuccess: (res) => setActiveAIConversationId(res.conversationId),
    });

  return (
    <motion.div
      className="flex h-full w-full bg-white dark:bg-[#141210] relative overflow-hidden"
      initial={{ opacity: 0, x: "2%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "2%" }}
      transition={{ type: "spring", stiffness: 380, damping: 35 }}
    >
      {/* ── Mobile sidebar scrim ─────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          // Base
          "flex flex-col border-r border-neutral-200 dark:border-white/8 bg-neutral-50/80 dark:bg-[#0f0e0c]/60",
          // Mobile: absolute slide-in overlay
          "absolute inset-y-0 left-0 z-30 w-72 shadow-xl transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: static sidebar
          "md:relative md:inset-y-auto md:left-auto md:z-auto md:w-64 md:shrink-0 md:translate-x-0 md:shadow-none",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-2.5 px-4 py-4 shrink-0">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-white/40 hover:text-neutral-700 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
            aria-label="Back to inbox"
          >
            <IconArrowLeft size={15} />
          </button>
          <span className="text-[13px] font-semibold text-neutral-600 dark:text-white/70">
            AI Assistant
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleNewConversation}
              className="p-1.5 rounded-lg text-neutral-400 dark:text-white/30 hover:text-neutral-600 dark:hover:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
              title="New conversation"
            >
              <IconMessageCirclePlus size={15} />
            </button>
            {/* Close sidebar — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 dark:text-white/30 hover:text-neutral-600 dark:hover:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
              aria-label="Close sidebar"
            >
              <IconX size={15} />
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            onPromptSelect={(p) => {
              setDraft(p);
              setSidebarOpen(false);
            }}
          />
        </div>
      </div>

      {/* ── Right — conversation area ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-3 border-b border-neutral-200 dark:border-white/8 shrink-0 bg-neutral-50/80 dark:bg-[#0f0e0c]/60">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-white/40 hover:text-neutral-700 dark:hover:text-white/80 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
            aria-label="Back to inbox"
          >
            <IconArrowLeft size={15} />
          </button>
          <span className="flex-1 text-[13px] font-semibold text-neutral-700 dark:text-white/80 truncate">
            AI Assistant
          </span>
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-white/30 hover:text-neutral-600 dark:hover:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
            title="New conversation"
          >
            <IconMessageCirclePlus size={15} />
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-white/30 hover:text-neutral-600 dark:hover:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/8 transition-all cursor-pointer"
            aria-label="Open conversations"
          >
            <IconMenu2 size={15} />
          </button>
        </div>

        {/* Body */}
        {activeAIConversationId ? (
          <ConversationView
            conversationId={activeAIConversationId}
            className="flex-1 overflow-hidden"
            footer={
              <AIInput
                value={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                disabled={sending || creating || isStreaming}
                className="max-w-2xl mx-auto"
              />
            }
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 space-y-5">
            <div className="text-center space-y-2.5">
              <p className="text-[22px] sm:text-[24px] font-bold text-neutral-800 dark:text-white/85 tracking-tight">
                What can I help you with?
              </p>
              <p className="text-[13px] sm:text-[13.5px] text-neutral-400 dark:text-white/40 leading-relaxed">
                Search, summarize, draft replies, and more
              </p>
            </div>

            <div className="w-full max-w-xl">
              <AIInput
                value={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                disabled={sending || creating}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
