"use client";

import { Suspense, useRef, useState, useCallback, useEffect } from "react";
import { IconNotes, IconX } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useThreadNote, useUpsertThreadNote,
} from "@/features/mailbox/mailbox.query";
import { cn } from "@/lib/utils";

// ─── Inner editor (suspense boundary) ─────────────────────────────────────────
function NotesEditorInner({ threadId, emailAddress }: { threadId: string; emailAddress: string }) {
  const { data }          = useThreadNote(threadId, emailAddress);
  const { mutate }        = useUpsertThreadNote();
  const [value, setValue] = useState(data?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mutate(
        { threadId, content: val, emailAddress },
        {
          onSuccess: () => { setStatus("saved"); setTimeout(() => setStatus("idle"), 1500); },
          onError:   () => setStatus("idle"),
        },
      );
    }, 600);
  }, [threadId, emailAddress, mutate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && !["z", "a", "c", "v", "x", "b", "i", "u"].includes(e.key.toLowerCase())) {
      e.currentTarget.blur();
    }
  }, []);

  return (
    <div className="p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Write a note about this thread…"
        rows={4}
        className={cn(
          "w-full resize-none rounded-xl px-3.5 py-3",
          "text-[12.5px] leading-relaxed min-h-24",
          "bg-gray-50 dark:bg-[#2a2a2a]",
          "border border-gray-100 dark:border-white/[0.07]",
          "text-gray-700 dark:text-white/68",
          "placeholder:text-gray-300 dark:placeholder:text-white/18",
          "focus:outline-none focus:ring-1 focus:ring-gray-200 dark:focus:ring-white/[0.12]",
          "transition-colors duration-150 overflow-hidden",
        )}
      />
      <div className="flex items-center justify-end mt-2 h-4">
        <span className={cn(
          "text-[10.5px] transition-opacity duration-300",
          status === "idle" ? "opacity-0" : "opacity-100",
          status === "saving" ? "text-gray-300 dark:text-white/25" : "text-emerald-500 dark:text-emerald-400",
        )}>
          {status === "saving" ? "saving…" : "saved ✓"}
        </span>
      </div>
    </div>
  );
}

// ─── Public dropdown ───────────────────────────────────────────────────────────
interface NotesDropdownProps {
  threadId:     string;
  emailAddress: string;
  onClose:      () => void;
}

export function NotesDropdown({ threadId, emailAddress, onClose }: NotesDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full right-0 mt-1.5 z-50 w-80",
        "rounded-2xl overflow-hidden",
        "bg-white dark:bg-[#27241f]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]",
        "dark:shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.10)]",
        "animate-in fade-in-0 zoom-in-95 duration-100",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <IconNotes size={13} className="text-gray-400 dark:text-white/30" />
          <span className="text-[12px] font-semibold text-gray-600 dark:text-white/48 tracking-tight">
            Thread Notes
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
        >
          <IconX size={12} />
        </button>
      </div>
      <Suspense fallback={<div className="p-4"><Skeleton className="h-20 w-full rounded-xl" /></div>}>
        <NotesEditorInner threadId={threadId} emailAddress={emailAddress} />
      </Suspense>
    </div>
  );
}