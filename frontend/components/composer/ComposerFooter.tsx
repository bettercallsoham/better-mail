"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import {
  IconSend2,
  IconTrash,
  IconLoader2,
  IconBookmark,
  IconTemplate,
  IconSparkles,
  IconArrowLeft,
  IconCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import {
  useReplyEmail,
  useSendEmail,
  useDeleteDraft,
  mailboxKeys,
} from "@/features/mailbox/mailbox.query";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { stripHtml } from "@/lib/utils/stripHtml";
import { useDraftSync } from "./hooks/useDraftSync";
import { TemplatePicker } from "./TemplatePicker";
import type { Template } from "@/features/templates/templates.types";
import { useCreateTemplate } from "@/features/templates/templates.query";
import { useSuggestEmail } from "@/features/ai/ai.query";
import type { SuggestEmailTone } from "@/features/ai/ai.type";

interface Props {
  instance: ComposerInstance;
  onClose: () => void;
  /** Optional: called after discard so parent can do optimistic cache updates */
  onDiscard?: () => void;
  className?: string;
}

export function ComposerFooter({
  instance,
  onClose,
  onDiscard,
  className,
}: Props) {
  const store = useComposerStore();
  const queryClient = useQueryClient();
  const replyEmail = useReplyEmail();
  const sendEmail = useSendEmail();
  const deleteDraft = useDeleteDraft();
  const { discard } = useDraftSync(instance);
  const createTemplate = useCreateTemplate();

  // ── Template picker state ─────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Save-as-template state ────────────────────────────────────────────────
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name input when save-as dialog opens
  useEffect(() => {
    if (saveAsOpen) {
      setTemplateName(instance.subject || "");
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [saveAsOpen, instance.subject]);

  const isSending = instance.status === "sending";
  const canSend =
    instance.mode === "new"
      ? instance.to.length > 0 &&
        !!instance.subject &&
        !!stripHtml(instance.html)
      : !!stripHtml(instance.html);

  const handleSend = useCallback(async () => {
    if (isSending || !canSend) return;
    store.setStatus(instance.id, "sending");

    // Compose the full outgoing HTML body: user-typed content + quoted block.
    // The quoted block is rendered separately in the UI (QuotedThread) but MUST
    // be appended to the sent body so recipients see the forwarded/quoted content.
    const fullHtml = instance.quotedHtml
      ? `${instance.html}${instance.quotedHtml}`
      : instance.html;

    try {
      if (instance.mode === "new") {
        await sendEmail.mutateAsync({
          from: instance.from,
          provider: instance.provider,
          to: instance.to.map((r) => r.email),
          cc: instance.cc.map((r) => r.email),
          bcc: instance.bcc.map((r) => r.email),
          subject: instance.subject,
          html: fullHtml,
        });
      } else {
        if (!instance.replyToMessageId)
          throw new Error("Missing replyToMessageId");

        const res = await replyEmail.mutateAsync({
          from: instance.from,
          provider: instance.provider,
          replyToMessageId: instance.replyToMessageId,
          html: fullHtml,
          mode: instance.mode === "reply_all" ? "reply_all" : instance.mode,
          to: instance.to.map((r) => r.email),
          cc: instance.cc.map((r) => r.email),
          bcc: instance.bcc.map((r) => r.email),
          subject: instance.subject,
        });

        // Optimistically append the sent email to the thread cache so it appears
        // instantly without waiting for the server invalidation re-fetch.
        if (instance.threadId) {
          const optimistic: FullEmail = {
            id: `optimistic_${Date.now()}`,
            providerMessageId: res.data.messageId,
            emailAddress: instance.from,
            provider: instance.provider === "GOOGLE" ? "gmail" : "outlook",
            subject: instance.subject,
            isArchived: false,
            bodyHtml: fullHtml,
            bodyText: "",
            snippet: stripHtml(instance.html).slice(0, 120),
            from: { email: instance.from, name: instance.from },
            to: instance.to.map((r) => ({
              email: r.email,
              name: r.name ?? r.email,
            })),
            cc: instance.cc.map((r) => ({
              email: r.email,
              name: r.name ?? r.email,
            })),
            receivedAt: new Date().toISOString(),
            isRead: true,
            hasAttachments: false,
            threadId: instance.threadId,
            isStarred: false,
            isDraft: false,
            labels: [],
          };
          queryClient.setQueryData(
            mailboxKeys.thread(instance.threadId),
            (old: any) =>
              !old?.data?.emails
                ? old
                : {
                    ...old,
                    data: {
                      ...old.data,
                      emails: [...old.data.emails, optimistic],
                    },
                  },
          );
        }
      }

      // If there was a draft in ES, clean it up now that the email has been sent.
      if (instance.draftId) deleteDraft.mutate(instance.draftId);

      store.setStatus(instance.id, "sent");
      toast.success("Message sent");
      setTimeout(() => onClose(), 300);
    } catch (err) {
      store.setStatus(instance.id, "error", (err as Error)?.message);
      toast.error("Failed to send", { description: "Please try again." });
    }
  }, [
    instance,
    isSending,
    canSend,
    store,
    queryClient,
    sendEmail,
    replyEmail,
    deleteDraft,
    onClose,
  ]);

  const handleDiscard = useCallback(() => {
    const hasTypedContent = !!stripHtml(instance.html);
    if (hasTypedContent && !confirm("Discard this draft?")) return;
    discard(); // delete server-side draft if created by this composer session
    onDiscard?.(); // let parent run optimistic cache removal for pre-loaded drafts
    onClose();
  }, [instance.html, discard, onDiscard, onClose]);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      store.setPendingTemplate(instance.id, template);
      setPickerOpen(false);
    },
    [store, instance.id],
  );

  const handleSaveAsTemplate = useCallback(async () => {
    const name = templateName.trim();
    if (!name) return;
    try {
      await createTemplate.mutateAsync({
        name,
        subject: instance.subject || "",
        body: instance.html || "",
      });
      toast.success("Template saved");
      setSaveAsOpen(false);
    } catch {
      toast.error("Failed to save template");
    }
  }, [templateName, instance.subject, instance.html, createTemplate]);

  // ── Composer-scoped keyboard shortcuts ────────────────────────────────────
  // Fire only when focus is inside this specific composer instance container.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const active = document.activeElement;
      const container = active?.closest(`[data-instance="${instance.id}"]`);
      if (!container) return;

      // ⌘↵ — send
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
      // ⌘⇧D — discard
      if ((e.key === "d" || e.key === "D") && e.shiftKey) {
        e.preventDefault();
        handleDiscard();
      }
      // ⌘. — toggle AI draft popover
      if (e.key === ".") {
        e.preventDefault();
        store.update(instance.id, { aiPanelOpen: !instance.aiPanelOpen });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [instance.id, handleSend, handleDiscard, store, instance.aiPanelOpen]);

  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center gap-2 px-3 py-2.5",
        "border-t border-black/6 dark:border-white/6",
        className,
      )}
    >
      <button
        onClick={handleDiscard}
        title="Discard"
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-gray-400 dark:text-white/30 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400"
      >
        <IconTrash size={15} />
      </button>

      {/* Template picker button */}
      <div className="relative">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          title="Insert template"
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
            pickerOpen
              ? "bg-black/[0.06] dark:bg-white/[0.1] text-gray-700 dark:text-white/75"
              : "text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60",
          )}
        >
          <IconTemplate size={15} />
        </button>

        {pickerOpen && (
          <>
            {/* Backdrop to close picker on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPickerOpen(false)}
            />
            {/* Mobile: fixed full-width above footer; desktop: absolute above button */}
            <div className="fixed inset-x-3 bottom-16 z-50 sm:absolute sm:bottom-full sm:left-0 sm:inset-x-auto sm:mb-2">
              <Suspense fallback={null}>
                <TemplatePicker
                  onClose={() => setPickerOpen(false)}
                  onSelect={handleTemplateSelect}
                  className="w-full sm:w-[340px]"
                />
              </Suspense>
            </div>
          </>
        )}
      </div>

      {/* Save as template button */}
      <div className="relative">
        <button
          onClick={() => setSaveAsOpen((o) => !o)}
          title="Save as template"
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
            saveAsOpen
              ? "bg-black/[0.06] dark:bg-white/[0.1] text-gray-700 dark:text-white/75"
              : "text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60",
          )}
        >
          <IconBookmark size={15} />
        </button>

        {saveAsOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSaveAsOpen(false)}
            />
            {/* Mobile: fixed full-width above footer; desktop: absolute above button */}
            <div
              className={cn(
                "fixed inset-x-3 bottom-16 z-50",
                "sm:absolute sm:bottom-full sm:left-0 sm:inset-x-auto sm:mb-2 sm:w-72",
                "p-3 rounded-xl",
                "bg-white dark:bg-[#1f1f1f]",
                "border border-black/[0.07] dark:border-white/[0.08]",
                "shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11.5px] font-semibold text-gray-500 dark:text-white/45 mb-2 uppercase tracking-wide">
                Save as template
              </p>
              <input
                ref={nameInputRef}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveAsTemplate();
                  }
                  if (e.key === "Escape") setSaveAsOpen(false);
                }}
                placeholder="Template name…"
                className={cn(
                  "w-full h-8 px-2.5 rounded-lg text-[12.5px] outline-none mb-2.5",
                  "bg-gray-50 dark:bg-white/[0.06]",
                  "border border-black/[0.08] dark:border-white/[0.1]",
                  "text-gray-800 dark:text-white/80",
                  "placeholder:text-gray-300 dark:placeholder:text-white/25",
                  "focus:border-gray-300 dark:focus:border-white/20",
                  "transition-colors",
                )}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setSaveAsOpen(false)}
                  className="h-7 px-3 rounded-lg text-[12px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || createTemplate.isPending}
                  className={cn(
                    "h-7 px-3 rounded-lg text-[12px] font-semibold transition-colors",
                    "bg-gray-900 dark:bg-white text-white dark:text-gray-950",
                    "hover:bg-gray-700 dark:hover:bg-gray-100",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {createTemplate.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI compose / rewrite button */}
      <div>
        <button
          onClick={() =>
            store.update(instance.id, { aiPanelOpen: !instance.aiPanelOpen })
          }
          title="Write with AI(⌘.)"
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
            instance.aiPanelOpen
              ? "bg-gray-100 dark:bg-white/[0.1] text-gray-700 dark:text-white/70"
              : "text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60",
          )}
        >
          <IconSparkles size={15} />
        </button>
      </div>

      {/* AI popover — centered over the composer body */}
      {instance.aiPanelOpen && (
        <AIPopover
          instance={instance}
          onClose={() => store.update(instance.id, { aiPanelOpen: false })}
          onApply={(html, subject) => {
            store.update(instance.id, {
              pendingTemplate: {
                id: 0,
                name: "AI Draft",
                body: html,
                subject,
                variables: [],
              },
              aiPanelOpen: false,
            });
            if (instance.mode === "new" && subject) {
              store.update(instance.id, { subject });
            }
          }}
        />
      )}

      <div className="flex-1" />

      <span className="hidden sm:block text-[10px] text-gray-300 dark:text-white/20 font-mono">
        ⌘↵
      </span>

      <button
        onClick={handleSend}
        disabled={isSending || !canSend}
        className={cn(
          "flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12.5px] font-semibold transition-all",
          "bg-gray-950 dark:bg-white text-white dark:text-gray-950",
          "hover:bg-gray-800 dark:hover:bg-gray-100",
          "disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]",
        )}
      >
        {isSending ? (
          <>
            <IconLoader2 size={14} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            <IconSend2 size={14} /> Send
          </>
        )}
      </button>
    </div>
  );
}

// ─── AI Popover ───────────────────────────────────────────────────────────────
// One-line compact input: [✦ topic input] [Tone ▾] [↑]
// Quick chips for fix-grammar / fix-spelling etc. (when has content)
// After generation → preview + Replace + refine list

type AIPhase = "idle" | "loading" | "result";

const AI_TONES: Array<{ value: SuggestEmailTone; label: string }> = [
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "professional", label: "Professional" },
  { value: "empathetic", label: "Empathetic" },
];

const QUICK_ACTIONS = [
  { label: "Fix grammar", instruction: "Fix all grammar and spelling errors" },
  { label: "Fix spelling", instruction: "Fix all spelling mistakes" },
  { label: "Shorten", instruction: "Make it shorter and more concise" },
  {
    label: "More formal",
    instruction: "Rewrite in a more formal, professional tone",
  },
  {
    label: "Add bullets",
    instruction: "Convert the main points into a bullet list",
  },
];

const REFINE_ACTIONS = [
  { label: "Shorter", instruction: "Make it shorter and more concise" },
  { label: "Longer", instruction: "Make it more detailed and elaborate" },
  {
    label: "More formal",
    instruction: "Make the tone more formal and professional",
  },
  {
    label: "Add bullets",
    instruction: "Convert the main points into bullet lists",
  },
];

function AIPopover({
  instance,
  onClose,
  onApply,
}: {
  instance: ComposerInstance;
  onClose: () => void;
  onApply: (html: string, subject: string) => void;
}) {
  const { mutateAsync } = useSuggestEmail();

  const draftHtml = instance.html || "";
  const hasContent = !!stripHtml(draftHtml).trim();
  const recipientName =
    instance.to?.[0]?.name ||
    (instance.to?.[0]?.email ? instance.to[0].email.split("@")[0] : undefined);

  const [phase, setPhase] = useState<AIPhase>("idle");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<SuggestEmailTone | undefined>(undefined);
  const [toneOpen, setToneOpen] = useState(false);
  const [preview, setPreview] = useState<{
    html: string;
    subject: string;
  } | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const refineRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const runGenerate = async (params: Parameters<typeof mutateAsync>[0]) => {
    setIsWorking(true);
    setPhase("loading");
    setToneOpen(false);
    try {
      const result = await mutateAsync(params);
      setPreview({ html: result.body, subject: result.subject });
      setPhase("result");
      setRefineInput("");
    } catch {
      toast.error("Failed to generate — please try again");
      setPhase(preview ? "result" : "idle");
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerate = () => {
    if (isWorking) return;
    if (hasContent) {
      runGenerate({
        mode: "rewrite",
        draft: draftHtml,
        refineInstruction: topic.trim() || undefined,
        tone,
        recipientName,
        subjectHint: instance.subject || undefined,
      });
    } else {
      if (!topic.trim()) return;
      runGenerate({
        mode: "compose",
        topic: topic.trim(),
        tone,
        recipientName,
        subjectHint: instance.subject || undefined,
      });
    }
  };

  const handleQuickAction = (instruction: string) => {
    const draft = preview?.html ?? draftHtml;
    if (!draft) return;
    runGenerate({
      mode: "refine",
      draft,
      refineInstruction: instruction,
      tone,
      subjectHint: preview?.subject ?? instance.subject ?? undefined,
    });
  };

  const handleRefine = (instruction?: string) => {
    const instr = instruction ?? refineInput.trim();
    if (!instr || isWorking || !preview) return;
    runGenerate({
      mode: "refine",
      draft: preview.html,
      refineInstruction: instr,
      tone,
      subjectHint: preview.subject || instance.subject || undefined,
    });
  };

  const toneLabel = AI_TONES.find((t) => t.value === tone)?.label ?? "Tone";

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute z-50 bottom-full left-2 right-2 mx-auto max-w-[300px] mb-2",
        "bg-white dark:bg-[#1f1f1f]",
        "rounded-xl overflow-visible",
        "border border-black/[0.08] dark:border-white/[0.09]",
        "shadow-[0_8px_30px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
      )}
    >
      {/* ─── LOADING ──────────────────────────────────────────────────────── */}
      {phase === "loading" && (
        <div className="px-4 py-4 rounded-xl">
          <div className="space-y-2">
            {[78, 55, 68, 40].map((w, i) => (
              <div
                key={i}
                className="h-[7px] rounded-full bg-gray-100 dark:bg-white/[0.07] animate-pulse"
                style={{ width: `${w}%`, animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-300 dark:text-white/20 flex items-center gap-1.5">
            <IconLoader2 size={11} className="animate-spin" /> Writing…
          </p>
        </div>
      )}

      {/* ─── RESULT ───────────────────────────────────────────────────────── */}
      {phase === "result" && preview && (
        <>
          {/* Preview */}
          <div
            className={cn(
              "px-4 pt-3.5 pb-3 max-h-[140px] overflow-y-auto",
              "border-b border-black/[0.05] dark:border-white/[0.06]",
              "text-[12.5px] leading-relaxed text-gray-700 dark:text-white/70",
              "[&_p]:mb-1.5 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-0.5",
            )}
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />

          {/* Replace / Start over */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06]">
            <button
              onClick={() => onApply(preview.html, preview.subject)}
              className={cn(
                "flex items-center gap-1.5 h-7 px-3 rounded-lg text-[12px] font-medium transition-colors",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                "hover:bg-gray-700 dark:hover:bg-gray-200",
              )}
            >
              <IconCheck size={12} /> Replace
            </button>
            <button
              onClick={() => {
                setPreview(null);
                setPhase("idle");
                setTopic("");
              }}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <IconArrowLeft size={12} /> Start over
            </button>
          </div>

          {/* Refine list */}
          <div className="py-1">
            {REFINE_ACTIONS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleRefine(chip.instruction)}
                disabled={isWorking}
                className={cn(
                  "w-full text-left px-4 py-1.5 text-[12.5px] transition-colors",
                  "text-gray-600 dark:text-white/55",
                  "hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white/80",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Custom refine */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-black/[0.04] dark:border-white/[0.05]">
            <input
              ref={refineRef}
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRefine();
                }
              }}
              placeholder="Or describe a change…"
              className="flex-1 text-[12px] outline-none bg-transparent text-gray-700 dark:text-white/70 placeholder:text-gray-300 dark:placeholder:text-white/20"
            />
            {refineInput.trim() && (
              <button
                onClick={() => handleRefine()}
                disabled={isWorking}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-30 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 10V2M2 5.5L6 2L10 5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── IDLE: single-line input row ──────────────────────────────────── */}
      {phase === "idle" && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            <IconSparkles
              size={13}
              className="shrink-0 text-gray-300 dark:text-white/22"
            />

            {/* Input — compose topic or rewrite instruction */}
            <input
              ref={inputRef}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
                if (e.key === "Escape") onClose();
              }}
              placeholder={
                hasContent
                  ? "Rewrite draft… (optional instructions)"
                  : "What's this email about?"
              }
              className="flex-1 min-w-0 text-[13px] outline-none bg-transparent text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/22"
            />

            {/* Tone dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setToneOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium transition-colors",
                  tone
                    ? "bg-gray-100 dark:bg-white/[0.1] text-gray-700 dark:text-white/70"
                    : "text-gray-400 dark:text-white/28 hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/55",
                )}
              >
                {toneLabel}
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  className={cn(
                    "transition-transform duration-150 text-current",
                    toneOpen && "rotate-180",
                  )}
                >
                  <path
                    d="M1 2.5L4 5.5L7 2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>

              {toneOpen && (
                <div
                  className={cn(
                    "absolute z-[60] bottom-[calc(100%+4px)] right-0",
                    "bg-white dark:bg-[#282828]",
                    "rounded-lg overflow-hidden",
                    "border border-black/[0.08] dark:border-white/[0.09]",
                    "shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]",
                    "py-1 min-w-[110px]",
                  )}
                >
                  {tone && (
                    <button
                      onClick={() => {
                        setTone(undefined);
                        setToneOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-gray-400 dark:text-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                    >
                      No tone
                    </button>
                  )}
                  {AI_TONES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setTone(value);
                        setToneOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[12.5px] transition-colors flex items-center justify-between",
                        tone === value
                          ? "text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-white/[0.06]"
                          : "text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05]",
                      )}
                    >
                      {label}
                      {tone === value && (
                        <IconCheck
                          size={11}
                          className="shrink-0 text-gray-400 dark:text-white/40"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send / generate arrow button */}
            <button
              onClick={handleGenerate}
              disabled={!hasContent && !topic.trim()}
              className={cn(
                "shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
                "hover:bg-gray-700 dark:hover:bg-gray-200",
                "disabled:opacity-25 disabled:cursor-not-allowed",
              )}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 10V2M2 5.5L6 2L10 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Quick action chips — only visible when draft has content */}
          {hasContent && (
            <div className="px-3 pb-2.5 border-t border-black/[0.04] dark:border-white/[0.05] pt-2 flex flex-wrap gap-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.instruction)}
                  disabled={isWorking}
                  className={cn(
                    "h-[22px] px-2 rounded-md text-[11px] font-medium transition-colors",
                    "text-gray-500 dark:text-white/38",
                    "hover:bg-gray-100 dark:hover:bg-white/[0.07] hover:text-gray-800 dark:hover:text-white/70",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
