"use client";

import { useState, useRef, useCallback } from "react";
import { IconMinus, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import { ComposerHeader } from "../ComposerHeader";
import { ComposerEditor } from "../ComposerEditor";
import { ComposerFooter } from "../ComposerFooter";

const WINDOW_W = 560;
const WINDOW_H = 460;
const MINI_H = 48;
const WINDOW_MARGIN = 24;

function useDrag(initX: number, initY: number) {
  const [pos, setPos] = useState({ x: initX, y: initY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

      const move = (e: MouseEvent) => {
        if (!dragging.current) return;
        setPos({
          x: Math.max(
            0,
            Math.min(
              window.innerWidth - WINDOW_W,
              e.clientX - offset.current.x,
            ),
          ),
          y: Math.max(
            0,
            Math.min(window.innerHeight - MINI_H, e.clientY - offset.current.y),
          ),
        });
      };
      const up = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", move);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up, { once: true });
    },
    [pos],
  );

  return { pos, onMouseDown };
}

export function WindowShell({
  instance,
  index,
}: {
  instance: ComposerInstance;
  index: number;
}) {
  const store = useComposerStore();
  const close = useCallback(
    () => store.close(instance.id),
    [store, instance.id],
  );
  const minimize = useCallback(
    () => store.minimize(instance.id),
    [store, instance.id],
  );
  const restore = useCallback(
    () => store.restore(instance.id),
    [store, instance.id],
  );

  const startX =
    window.innerWidth - WINDOW_W - WINDOW_MARGIN - index * (WINDOW_W + 12);
  const startY = window.innerHeight - WINDOW_H - WINDOW_MARGIN;
  const { pos, onMouseDown } = useDrag(startX, startY);

  const mini = instance.isMinimized;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: mini ? window.innerHeight - MINI_H - WINDOW_MARGIN : pos.y,
        width: WINDOW_W,
        height: mini ? MINI_H : WINDOW_H,
        zIndex: 1000 + index,
      }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl",
        "bg-white dark:bg-[#1c1c1c]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.16),0_0_0_1px_rgba(0,0,0,0.08)]",
        "dark:shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]",
        "transition-[height] duration-200 ease-out",
        "animate-in slide-in-from-bottom-4 duration-200",
      )}
    >
      {/* Drag handle / title bar */}
      <div
        onMouseDown={onMouseDown}
        className="shrink-0 flex items-center gap-2 px-4 h-12 cursor-grab active:cursor-grabbing select-none border-b border-black/[0.06] dark:border-white/[0.06]"
      >
        <span className="flex-1 text-[13px] font-semibold text-gray-700 dark:text-white/75 truncate">
          {instance.mode === "new"
            ? "New Message"
            : instance.subject
              ? `Re: ${instance.subject}`
              : "Reply"}
        </span>
        <div className="flex gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
          <WinBtn
            onClick={mini ? restore : minimize}
            title={mini ? "Restore" : "Minimize"}
          >
            <IconMinus size={12} />
          </WinBtn>
          <WinBtn onClick={close} title="Close" danger>
            <IconX size={12} />
          </WinBtn>
        </div>
      </div>

      {!mini && (
        <>
          <ComposerHeader instance={instance} />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <ComposerEditor
              instance={instance}
              placeholder="Write your message…"
              minHeight={180}
            />
          </div>
          <ComposerFooter instance={instance} onClose={close} />
        </>
      )}
    </div>
  );
}

function WinBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-6 h-6 flex items-center justify-center rounded-md transition-colors text-gray-400 dark:text-white/25",
        danger
          ? "hover:bg-red-50 dark:hover:bg-red-950/25 hover:text-red-500 dark:hover:text-red-400"
          : "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-gray-600 dark:hover:text-white/55",
      )}
    >
      {children}
    </button>
  );
}
