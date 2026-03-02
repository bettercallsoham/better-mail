"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useUIStore } from "@/lib/store/ui.store";

export function UrlParamsSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialParams = useRef(searchParams);

  const { activeFolder, activeThreadId, setActiveFolder, setActiveThread } =
    useUIStore(
      useShallow((s) => ({
        activeFolder: s.activeFolder,
        activeThreadId: s.activeThreadId,
        setActiveFolder: s.setActiveFolder,
        setActiveThread: s.setActiveThread,
      })),
    );

  useEffect(() => {
    const folder = initialParams.current.get("folder");
    const thread = initialParams.current.get("thread");
    if (folder) setActiveFolder(folder);
    if (thread) setActiveThread(thread);
  }, [setActiveFolder, setActiveThread]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeFolder && activeFolder !== "inbox")
      params.set("folder", activeFolder);
    if (activeThreadId) params.set("thread", activeThreadId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeFolder, activeThreadId, router, pathname]);

  return null;
}
