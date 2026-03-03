"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast: [
            "!flex !items-start !gap-3",
            "!rounded-2xl !px-4 !py-3.5",
            "!bg-white dark:!bg-neutral-900",
            "!border !border-black/[0.07] dark:!border-white/[0.09]",
            "!shadow-[0_4px_24px_rgba(0,0,0,0.09),0_1px_4px_rgba(0,0,0,0.05)]",
            "dark:!shadow-[0_4px_24px_rgba(0,0,0,0.5)]",
            "!w-[340px] !max-w-[calc(100vw-2rem)]",
          ].join(" "),
          icon: "!mt-0.5 !shrink-0",
          content: "!flex-1 !min-w-0",
          title:
            "!text-[13.5px] !font-semibold !text-gray-900 dark:!text-white/90 !leading-snug",
          description:
            "!text-[12px] !text-gray-500 dark:!text-white/45 !leading-snug !mt-0.5",
          closeButton: [
            "!static !translate-x-0 !translate-y-0 !ml-auto !shrink-0 !mt-0.5",
            "!bg-transparent !border-none !text-gray-300 dark:!text-white/25",
            "hover:!text-gray-600 dark:hover:!text-white/60 !transition-colors",
          ].join(" "),
        },
      }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-red-500" />,
        loading: <Loader2Icon className="size-4 animate-spin text-gray-400" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
