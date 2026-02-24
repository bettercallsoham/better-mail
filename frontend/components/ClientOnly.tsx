"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after client hydration.
 * Wrap any Suspense boundary that makes authenticated API calls to prevent
 * Next.js SSR from firing those fetches on the server (where auth cookies
 * don't exist yet), which causes the "Recoverable Error: Unauthorized".
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
