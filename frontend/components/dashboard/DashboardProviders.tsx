"use client";

import { useRealtimeNotifications } from "@/lib/realtime/useRealTimeNotifications";
import { ReactNode } from "react";

export function DashboardProviders({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  useRealtimeNotifications(userId);
  return <>{children}</>;
}
