"use client";

import { Suspense } from "react";
import { useThreadDetail } from "@/features/mailbox/mailbox.query";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtDate, stripMark } from "./ResultsList";
import type { SearchEmail } from "@/features/mailbox/mailbox.type";

function Avatar({ email, name }: { email: string; name?: string }) {
  const hue = email.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const initials = (name || email)[0].toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[12px] font-semibold"
      style={{ background: `hsl(${hue} 45% 45%)` }}
    >
      {initials}
    </div>
  );
}

// ── Fast preview from SearchEmail ─────────────────────────────────────

function EmailPreview({ email }: { email: SearchEmail }) {
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto gap-3">
      <div className="flex items-start gap-2.5">
        <Avatar email={email.from.email} name={email.from.name} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[12.5px] font-semibold text-gray-800 dark:text-white/85 truncate leading-tight">
            {email.from.name || email.from.email}
          </p>
          {email.from.name && (
            <p className="text-[11px] text-gray-400 dark:text-white/28 truncate">{email.from.email}</p>
          )}
          <p className="text-[11px] text-gray-400 dark:text-white/25 mt-0.5">{fmtDate(email.receivedAt)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-white/85 leading-snug mb-1.5">
          {stripMark(email.subject)}
        </h3>
        <p className="text-[12px] text-gray-500 dark:text-white/38 leading-relaxed">
          {stripMark(email.snippet)}
        </p>
      </div>
    </div>
  );
}

// ── Full thread preview ───────────────────────────────────────────────

function ThreadPreviewContent({ threadId }: { threadId: string }) {
  const { data } = useThreadDetail(threadId);
  if (!data?.success || !data.data.emails.length) return <EmptyPreview />;

  const first  = data.data.emails[0];
  const latest = data.data.emails[data.data.emails.length - 1];

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto gap-3">
      <div className="flex items-start gap-2.5">
        <Avatar email={latest.from.email} name={latest.from.name} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[12.5px] font-semibold text-gray-800 dark:text-white/85 truncate leading-tight">
            {latest.from.name || latest.from.email}
          </p>
          {latest.from.name && (
            <p className="text-[11px] text-gray-400 dark:text-white/28 truncate">{latest.from.email}</p>
          )}
          <p className="text-[11px] text-gray-400 dark:text-white/25 mt-0.5">{fmtDate(latest.receivedAt)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-white/85 leading-snug mb-1">
          {first.subject}
        </h3>
        <p className="text-[11px] text-gray-400 dark:text-white/28 mb-2">
          {data.data.emails.length} {data.data.emails.length === 1 ? "message" : "messages"}
        </p>
        <p className="text-[12px] text-gray-500 dark:text-white/38 leading-relaxed">
          {latest.snippet}
        </p>
      </div>
    </div>
  );
}

// ── Public ────────────────────────────────────────────────────────────

export function PreviewPane({
  email,
  threadId,
}: {
  email: SearchEmail | null;
  threadId?: string | null;
}) {
  if (email)
    return <EmailPreview email={email} />;

  if (threadId)
    return (
      <Suspense fallback={<PreviewSkeleton />}>
        <ThreadPreviewContent threadId={threadId} />
      </Suspense>
    );

  return <EmptyPreview />;
}

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
      <p className="text-[12px] text-gray-300 dark:text-white/18 select-none">Hover to preview</p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-3/5" />
          <Skeleton className="h-2 w-2/5" />
        </div>
      </div>
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-3/4" />
    </div>
  );
}