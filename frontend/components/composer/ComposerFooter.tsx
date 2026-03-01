"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import {
  IconSend2,
  IconTrash,
  IconLoader2,
  IconBookmark,
  IconTemplate,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import { useReplyEmail, useSendEmail, useDeleteDraft, mailboxKeys } from "@/features/mailbox/mailbox.query";
import type { FullEmail } from "@/features/mailbox/mailbox.type";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { stripHtml } from "@/lib/utils/stripHtml";
import { useDraftSync } from "./hooks/useDraftSync";
import { TemplatePicker } from "./TemplatePicker";
import type { Template } from "@/features/templates/templates.types";
import { useCreateTemplate } from "@/features/templates/templates.query";

interface Props {
  instance:   ComposerInstance;
  onClose:    () => void;
  /** Optional: called after discard so parent can do optimistic cache updates */
  onDiscard?: () => void;
  className?: string;
}

export function ComposerFooter({ instance, onClose, onDiscard, className }: Props) {
  const store       = useComposerStore();
  const queryClient = useQueryClient();
  const replyEmail  = useReplyEmail();
  const sendEmail   = useSendEmail();
  const deleteDraft = useDeleteDraft();
  const { discard } = useDraftSync(instance);
  const createTemplate = useCreateTemplate();

  // ── Template picker state ─────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Save-as-template state ────────────────────────────────────────────────
  const [saveAsOpen, setSaveAsOpen]     = useState(false);
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
      ? instance.to.length > 0 && !!instance.subject && !!stripHtml(instance.html)
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
          from:     instance.from,
          provider: instance.provider,
          to:       instance.to.map((r) => r.email),
          cc:       instance.cc.map((r) => r.email),
          bcc:      instance.bcc.map((r) => r.email),
          subject:  instance.subject,
          html:     fullHtml,
        });
      } else {
        if (!instance.replyToMessageId) throw new Error("Missing replyToMessageId");

        const res = await replyEmail.mutateAsync({
          from:             instance.from,
          provider:         instance.provider,
          replyToMessageId: instance.replyToMessageId,
          html:             fullHtml,
          mode:             instance.mode === "reply_all" ? "reply_all" : instance.mode,
          to:               instance.to.map((r) => r.email),
          cc:               instance.cc.map((r) => r.email),
          bcc:              instance.bcc.map((r) => r.email),
          subject:          instance.subject,
        });

        // Optimistically append the sent email to the thread cache so it appears
        // instantly without waiting for the server invalidation re-fetch.
        if (instance.threadId) {
          const optimistic: FullEmail = {
            id:                `optimistic_${Date.now()}`,
            providerMessageId: res.data.messageId,
            emailAddress:      instance.from,
            provider:          instance.provider === "GOOGLE" ? "gmail" : "outlook",
            subject:           instance.subject,
            isArchived:        false,
            bodyHtml:          fullHtml,
            bodyText:          "",
            snippet:           stripHtml(instance.html).slice(0, 120),
            from:              { email: instance.from, name: instance.from },
            to:                instance.to.map((r) => ({ email: r.email, name: r.name ?? r.email })),
            cc:                instance.cc.map((r) => ({ email: r.email, name: r.name ?? r.email })),
            receivedAt:        new Date().toISOString(),
            isRead:            true,
            hasAttachments:    false,
            threadId:          instance.threadId,
            isStarred:         false,
            isDraft:           false,
            labels:            [],
          };
          queryClient.setQueryData(
            mailboxKeys.thread(instance.threadId),
            (old: any) => !old?.data?.emails ? old : {
              ...old,
              data: { ...old.data, emails: [...old.data.emails, optimistic] },
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
  }, [instance, isSending, canSend, store, queryClient, sendEmail, replyEmail, deleteDraft, onClose]);

  const handleDiscard = useCallback(() => {
    const hasTypedContent = !!stripHtml(instance.html);
    if (hasTypedContent && !confirm("Discard this draft?")) return;
    discard(); // delete server-side draft if created by this composer session
    onDiscard?.(); // let parent run optimistic cache removal for pre-loaded drafts
    onClose();
  }, [instance.html, discard, onDiscard, onClose]);

  const handleTemplateSelect = useCallback((template: Template) => {
    store.setPendingTemplate(instance.id, template);
    setPickerOpen(false);
  }, [store, instance.id]);

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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [instance.id, handleSend, handleDiscard]);

  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-2 px-3 py-2.5",
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
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <Suspense fallback={null}>
                <TemplatePicker
                  onClose={() => setPickerOpen(false)}
                  onSelect={handleTemplateSelect}
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
            <div
              className={cn(
                "absolute bottom-full left-0 mb-2 z-50 w-72 p-3 rounded-xl",
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
                  if (e.key === "Enter") { e.preventDefault(); handleSaveAsTemplate(); }
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
          <><IconLoader2 size={14} className="animate-spin" /> Sending…</>
        ) : (
          <><IconSend2 size={14} /> Send</>
        )}
      </button>
    </div>
  );
}
