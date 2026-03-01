"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useComposerStore, type ComposerInstance } from "@/lib/store/composer.store";
import { useCreateDraft, useUpdateDraft, useDeleteDraft, mailboxKeys } from "@/features/mailbox/mailbox.query";
import { stripHtml } from "@/lib/utils/stripHtml";

const DEBOUNCE_MS = 1500;

export function useDraftSync(instance: ComposerInstance) {
  const store        = useComposerStore();
  const queryClient  = useQueryClient();
  const createDraft  = useCreateDraft();
  const updateDraft  = useUpdateDraft();
  const deleteDraft  = useDeleteDraft();

  const instanceRef     = useRef(instance);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingRef     = useRef(false); 
  instanceRef.current   = instance;

  useEffect(() => {
    const inst = instanceRef.current;

    // Drafts only apply to new emails, not replies/forwards
    if (inst.mode !== "new") return;

    // Nothing to sync if html is empty
    if (!stripHtml(inst.html)) return;

    // ── If we don't have a draftId yet, create one ─────────────────────────
    if (!inst.draftId && !creatingRef.current) {
      creatingRef.current = true;

      createDraft.mutate(
        {
          from:     inst.from,
          provider: inst.provider,
          to:       inst.to.map((r) => r.email),
          cc:       inst.cc.map((r) => r.email),
          bcc:      inst.bcc.map((r) => r.email),
          subject:  inst.subject,
          html:     inst.html,
          threadId: inst.threadId,
        },
        {
          onSuccess: (res) => {
            // Store draftId so subsequent updates use the PATCH route
            store.setDraftId(inst.id, res.data.id, res.data.providerDraftId);
            creatingRef.current = false;
            // Invalidate thread detail so auto-restore works if composer is closed and thread reopened
            if (inst.threadId) {
              queryClient.invalidateQueries({ queryKey: mailboxKeys.thread(inst.threadId) });
            }
          },
          onError: () => {
            creatingRef.current = false;
          },
        },
      );
      return;
    }

    // ── Draft exists — debounce an update ─────────────────────────────────
    if (inst.draftId) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const current = instanceRef.current;
        if (!current.draftId || !current.isDirty) return;

        updateDraft.mutate({
          id:      current.draftId,
          to:      current.to.map((r) => ({ email: r.email })),
          cc:      current.cc.map((r) => ({ email: r.email })),
          bcc:     current.bcc.map((r) => ({ email: r.email })),
          subject: current.subject,
          html:    current.html,
        });
      }, DEBOUNCE_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Re-run whenever html or recipients change (isDirty covers both)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.html, instance.isDirty, instance.draftId]);

  /** Call this when discarding without sending to clean up the server draft */
  const discard = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const draftId = instanceRef.current.draftId;
    if (draftId) deleteDraft.mutate(draftId);
  };

  return { discard };
}
