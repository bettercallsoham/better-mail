"use client";

import { useCallback } from "react";
import {
  useComposerStore,
  type ComposerShell,
  type OpenComposerParams,
} from "@/lib/store/composer.store";
import { useUIStore } from "@/lib/store/ui.store";
import type { FullEmail } from "@/features/mailbox/mailbox.type";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function useComposer() {
  const store = useComposerStore();
  const selectedEmail = useUIStore((s) => s.selectedEmailAddress);

  // FullEmail.provider is "gmail" | "outlook" — API wants "GOOGLE" | "OUTLOOK"
  function toApiProvider(p?: string): "GOOGLE" | "OUTLOOK" {
    return p?.toLowerCase() === "outlook" ? "OUTLOOK" : "GOOGLE";
  }

  const replyTo = useCallback(
    (
      email: FullEmail,
      shell: ComposerShell = "panel",
      mode: OpenComposerParams["mode"] = "reply",
    ) => {
      const from = selectedEmail ?? email.emailAddress ?? "";
      const provider = toApiProvider(email.provider);

      // Build quoted HTML from FullEmail fields
      const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US";
      const date = new Date(email.receivedAt).toLocaleString(locale, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const fromLabel = email.from.name
        ? `${escHtml(email.from.name)} &lt;${escHtml(email.from.email)}&gt;`
        : escHtml(email.from.email);
      const quotedHtml = `
      <div style="border-left:2px solid #d1d5db;padding-left:12px;margin-top:16px;color:#6b7280;font-size:13px;">
        <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;">On ${date}, ${fromLabel} wrote:</p>
        ${email.bodyHtml ?? email.snippet ?? ""}
      </div>
    `.trim();

      const to =
        mode === "reply"
          ? [{ email: email.from.email, name: email.from.name }]
          : [
              { email: email.from.email, name: email.from.name },
              // FullEmail.to is EmailAddress[] — filter out self
              ...(email.to ?? []).filter((r) => r.email !== from),
            ];

      return store.open({
        shell,
        mode,
        from,
        provider,
        threadId: email.threadId,
        replyToMessageId: email.providerMessageId,
        quotedHtml,
        to,
        subject:
          mode === "forward" ? `Fwd: ${email.subject}` : `Re: ${email.subject}`,
      });
    },
    [store, selectedEmail],
  );

  const forward = useCallback(
    (email: FullEmail, shell: ComposerShell = "panel") =>
      replyTo(email, shell, "forward"),
    [replyTo],
  );

  const compose = useCallback(
    (shell: ComposerShell = "window") =>
      store.open({
        shell,
        mode: "new",
        from: selectedEmail ?? "",
        provider: "GOOGLE",
      }),
    [store, selectedEmail],
  );

  return { replyTo, forward, compose };
}
