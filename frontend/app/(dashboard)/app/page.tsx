"use client";

import { Suspense, useState } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import Image from "next/image";
import { useCurrentUser } from "@/features/user/user.query";
import {
  useConnectedAccounts,
  useThreadEmails,
  useThreadDetail,
} from "@/features/mailbox/mailbox.query";

/* ---------------- Error Fallback ---------------- */

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-md mx-auto mt-10">
      <h2 className="text-red-800 font-bold mb-1">Application Error</h2>
      <p className="text-red-600 text-sm">
        {(error as Error)?.message || "Something went wrong"}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-semibold hover:bg-red-200 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

/* ---------------- Thread Detail ---------------- */

function ThreadDetail({ threadId }: { threadId: string }) {
  const { data } = useThreadDetail(threadId);

  if (!data?.success) {
    throw new Error("Failed to load thread");
  }

  const emails = data.data?.emails ?? [];

  return (
    <div className="mt-4 space-y-4">
      <h3 className="font-bold text-lg border-b pb-2">Conversation</h3>

      {emails.map((email) => (
        <div
          key={email.id}
          className="bg-white border rounded-xl p-4 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="font-semibold text-sm">
                {email.from?.name || email.from?.email}
              </p>
              <p className="text-xs text-gray-500">
                {email.from?.email}
              </p>
            </div>
            <p className="text-[10px] text-gray-400">
              {new Date(email.receivedAt).toLocaleString()}
            </p>
          </div>

          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{
              __html: email.bodyHtml ?? "",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Main Content ---------------- */

function AppContent() {
  const { data: userResponse } = useCurrentUser();
  const { data: mailboxResponse } = useConnectedAccounts();

  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const threadsQuery = useThreadEmails(selectedEmail ?? undefined);

  if (!userResponse?.success) {
    throw new Error(userResponse?.message || "Session expired");
  }

  if (!mailboxResponse?.success) {
    throw new Error(mailboxResponse?.message || "Failed to load mailboxes");
  }

  const { user } = userResponse;
  const accounts = mailboxResponse.data ?? [];

  const allThreads =
    selectedEmail && threadsQuery.data
      ? threadsQuery.data.pages.flatMap(
          (page) => page.data?.threads ?? []
        )
      : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* LEFT PANEL */}
      <div className="space-y-8">
        {/* USER HEADER */}
        <section className="flex items-center gap-4 p-5 border rounded-2xl bg-white shadow-sm">
          <Image
            src={user.avatar}
            alt={user.fullName}
            width={56}
            height={56}
            className="rounded-full"
          />
          <div>
            <h1 className="font-bold text-xl">{user.fullName}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </section>

        {/* MAILBOXES */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Mailboxes
          </h2>

          <div className="grid gap-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => {
                  setSelectedEmail(account.email);
                  setSelectedThreadId(null);
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedEmail === account.email
                    ? "border-blue-400 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <p className="text-sm font-semibold">{account.email}</p>
              </div>
            ))}
          </div>
        </section>

        {/* THREAD LIST */}
        {selectedEmail && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Inbox
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {allThreads.map((thread) => {
                const isSelected =
                  selectedThreadId === thread.threadId;

                return (
                  <div
                    key={thread.threadId}
                    onClick={() =>
                      setSelectedThreadId(thread.threadId)
                    }
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-semibold text-sm truncate">
                      {thread.subject || "(No Subject)"}
                    </p>

                    <p
                      className={`text-xs truncate ${
                        isSelected
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {thread.snippet}
                    </p>
                  </div>
                );
              })}

              {threadsQuery.hasNextPage && (
                <button
                  onClick={() => threadsQuery.fetchNextPage()}
                  className="w-full py-2 text-xs bg-gray-100 rounded-lg"
                >
                  Load More
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="relative">
        {selectedThreadId ? (
          <Suspense
            fallback={
              <div className="p-10 text-center animate-pulse text-gray-400">
                Loading conversation...
              </div>
            }
          >
            <ThreadDetail threadId={selectedThreadId} />
          </Suspense>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 text-gray-300">
            <p className="text-sm font-medium">
              Select a thread to read
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- PAGE WRAPPER ---------------- */

export default function AppPage() {
  return (
    <main className="max-w-5xl mx-auto py-12 px-4">
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            FallbackComponent={ErrorFallback}
          >
            <Suspense
              fallback={
                <div className="space-y-8 animate-pulse">
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                  <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
              }
            >
              <AppContent />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </main>
  );
}