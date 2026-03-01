import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { QueryProvider } from "@/lib/query/provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { DashboardProviders } from "@/components/dashboard/DashboardProviders";
import { getUserFromToken } from "@/lib/auth/getUserFromToken";
import { Toaster } from "@/components/ui/sonner";
import { ComposerPortal } from "@/components/composer";
import { GlobalShortcutsMount } from "@/components/shortcuts/GlobalShortcutsMount";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("access_token");
  if (!token) redirect("/login");

  const user = getUserFromToken(token.value);
  if (!user) redirect("/login");

  return (
    <QueryProvider>
      <DashboardProviders userId={user.id}>
        <div className="flex flex-col md:flex-row h-screen w-screen bg-white dark:bg-[#1c1a18] overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
          <Toaster />
          <ComposerPortal />
          <GlobalShortcutsMount />
        </div>
      </DashboardProviders>
    </QueryProvider>
  );
}
