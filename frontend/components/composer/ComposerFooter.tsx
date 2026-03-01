"use client";

import { useCallback } from "react";
import { IconSend2, IconTrash, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
// Your existing hooks from mailbox.query.ts
import { useReplyEmail, useSendEmail } from "@/features/mailbox/mailbox.query";
import { toast } from "sonner";
import { stripHtml } from "@/lib/utils/stripHtml";

interface Props {
  instance: ComposerInstance;
  onClose: () => void;
  className?: string;
}

export function ComposerFooter({ instance, onClose, className }: Props) {
  const store = useComposerStore();
  const replyEmail = useReplyEmail(); // useMutation from mailbox.query.ts
  const sendEmail = useSendEmail(); // useMutation from mailbox.query.ts

  const isSending = instance.status === "sending";
  const canSend =
    instance.mode === "new"
      ? instance.to.length > 0 && !!instance.subject
      : !!stripHtml(instance.html); // needs some content

  const handleSend = useCallback(async () => {
    if (isSending || !canSend) return;
    store.setStatus(instance.id, "sending");

    try {
      if (instance.mode === "new") {
        // SendEmailParams from mailbox.type.ts
        await sendEmail.mutateAsync({
          from: instance.from,
          provider: instance.provider,
          to: instance.to.map((r) => r.email),
          cc: instance.cc.map((r) => r.email),
          bcc: instance.bcc.map((r) => r.email),
          subject: instance.subject,
          html: instance.html,
        });
      } else {
        if (!instance.replyToMessageId)
          throw new Error("Missing replyToMessageId");

        await replyEmail.mutateAsync({
          from: instance.from,
          provider: instance.provider,
          replyToMessageId: instance.replyToMessageId,
          html: instance.html,
          mode: instance.mode === "reply_all" ? "reply_all" : instance.mode,
          to: instance.to.map((r) => r.email),
          cc: instance.cc.map((r) => r.email),
          bcc: instance.bcc.map((r) => r.email),
          subject: instance.subject,
        });
      }

      store.setStatus(instance.id, "sent");
      toast.success("Message sent");
      setTimeout(() => onClose(), 300);
    } catch (err) {
      store.setStatus(instance.id, "error", (err as Error)?.message);
      toast.error("Failed to send", { description: "Please try again." });
    }
  }, [instance, isSending, canSend, store, sendEmail, replyEmail, onClose]);

  const handleDiscard = useCallback(() => {
    if (instance.isDirty && !confirm("Discard this draft?")) return;
    onClose();
  }, [instance.isDirty, onClose]);

  return (
    <div
      className={cn(
        "shrink-0 flex items-center gap-2 px-3 py-2.5",
        "border-t border-black/[0.06] dark:border-white/[0.06]",
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
