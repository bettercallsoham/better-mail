"use client";

import { useCallback } from "react";
import { IconSend2, IconTrash, IconLoader2 } from "@tabler/icons-react";
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
