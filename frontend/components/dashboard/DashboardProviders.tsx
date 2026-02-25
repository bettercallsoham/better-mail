"use client";

import { useCurrentUser } from "@/features/user/user.query";
import { useRealtimeNotifications } from "@/lib/realtime/useRealTimeNotifications";
import { ReactNode } from "react";

export function DashboardProviders({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser();

  useRealtimeNotifications(user.user.id ?? null);

  return <>{children}</>;
}
