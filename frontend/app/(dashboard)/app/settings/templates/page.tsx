import { Suspense } from "react";
import { TemplatesPage } from "@/components/templates/TemplatesPage";

function TemplatesSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="h-[17px] w-28 bg-black/[0.06] dark:bg-white/[0.06] rounded-md" />
          <div className="h-3 w-20 bg-black/[0.04] dark:bg-white/[0.04] rounded-md" />
        </div>
        <div className="h-9 w-36 bg-black/[0.06] dark:bg-white/[0.06] rounded-xl" />
      </div>
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-black/[0.04] dark:bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TemplatesRoute() {
  return (
    <Suspense fallback={<TemplatesSkeleton />}>
      <TemplatesPage />
    </Suspense>
  );
}
