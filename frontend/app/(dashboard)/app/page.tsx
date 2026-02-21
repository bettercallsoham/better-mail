"use client";

import { Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import Image from "next/image";
import { useCurrentUser } from "@/lib/query/user";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600">
        {(error as Error)?.message || "Auth Error"}
      </p>
      <button onClick={resetErrorBoundary} className="mt-2 underline text-sm">
        Retry
      </button>
    </div>
  );
}

function AppContent() {
  const { data } = useCurrentUser();

  if (!data.success || !data.user) {
    throw new Error(data.message || "Session expired");
  }

  const { user } = data;

  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl">
      <Image
        src={user.avatar}
        alt={user.fullName}
        width={48}
        height={48}
        className="rounded-full"
      />
      <div>
        <h1 className="font-bold">{user.fullName}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          <Suspense fallback={<div>Loading profile...</div>}>
            <AppContent />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
