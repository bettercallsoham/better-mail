"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { useUIStore } from "@/lib/store/ui.store";
import { ThreadList } from "@/components/dashboard/thread-view/ThreadList";
import { ThreadDetail } from "@/components/dashboard/thread-view/ThreadDetail";
import { SenderPane } from "@/components/dashboard/thread-view/SenderPane";
import { EmailOverlay } from "@/components/dashboard/thread-view/EmailOverlay";
import { cn } from "@/lib/utils";

function readLayout(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

function DetailPane({ layoutMode }: { layoutMode: "velocity" | "flow" }) {
  const activeThreadId = useUIStore((s) => s.activeThreadId);

  return (
    <div
      className={cn(
        "h-full",
        layoutMode === "flow" && [
          "max-sm:absolute max-sm:inset-0 max-sm:z-20",
          "max-sm:bg-white dark:max-sm:bg-neutral-950",
          "max-sm:transition-transform max-sm:duration-300",
          activeThreadId ? "max-sm:translate-x-0" : "max-sm:translate-x-full",
        ],
      )}
    >
      {layoutMode === "flow" ? (
        <ThreadDetail className="h-full" />
      ) : (
        <SenderPane className="h-full" />
      )}
    </div>
  );
}

export default function AppPage() {
  const layoutMode = useUIStore((s) => s.layoutMode);

  const [listMinSize, detailMinSize] =
    layoutMode === "velocity" ? [800, 300] : [300, 500];
  const [listMaxSize, detailMaxSize] =
    layoutMode === "velocity" ? [1000, 300] : [500, 1000];

  const storageKey = `mail-layout-${layoutMode}`;

  const savedLayout =
    typeof window !== "undefined" ? readLayout(storageKey) : undefined;

  if (layoutMode === "zen") {
    return (
      <>
        <ThreadList className="h-full" />
        <EmailOverlay />
      </>
    );
  }

  return (
    <>
      <Group
        orientation="horizontal"
        defaultLayout={savedLayout ?? [listMinSize, detailMinSize]}
        onLayoutChanged={(layout) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(layout));
          } catch {}
        }}
        className="h-full"
      >
        {/* Thread list */}
        <Panel
          defaultSize={listMinSize}
          minSize={listMinSize}
          maxSize={listMaxSize}
        >
          <ThreadList className="h-full" />
        </Panel>

        <Separator
          className={cn(
            "relative w-px bg-black/6 dark:bg-white/6",
            "cursor-col-resize transition-colors duration-150",
            "hover:bg-blue-400 dark:hover:bg-blue-500",
            "after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-['']",
          )}
        />

        <Panel
          defaultSize={detailMinSize}
          minSize={detailMinSize}
          maxSize={detailMaxSize}
          className="border-l border-black/6 dark:border-white/6"
        >
          <DetailPane layoutMode={layoutMode} />
        </Panel>
      </Group>

      <EmailOverlay />
    </>
  );
}
