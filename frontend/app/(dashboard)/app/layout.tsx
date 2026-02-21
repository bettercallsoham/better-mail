import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ReactNode } from "react";
import { QueryProvider } from "@/lib/query/provider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("access_token");

  if (!token) {
    redirect("/login");
  }

  return <QueryProvider>{children}</QueryProvider>;
}
