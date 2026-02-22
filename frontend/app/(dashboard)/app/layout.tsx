import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { QueryProvider } from "@/lib/query/provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("access_token");

  if (!token) {
    redirect("/login");
  }

  return (
    <QueryProvider>
      <div className="flex h-screen w-screen bg-white dark:bg-neutral-950 overflow-hidden">
        <DashboardSidebar />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </QueryProvider>
  );
}
