"use client";

import { useState, useRef, useCallback } from "react";
import { X, ImagePlus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui.store";
import { TypeBadge } from "./TypeBadge";

import {
  Lightbulb, Bug, Sparkles, HelpCircle,
} from "lucide-react";
import { CreateFeedbackPostDto, FeedbackPostType } from "@/features/feedback/feedback.type";
import { useCreatePost } from "@/features/feedback/feedback.query";
import { uploadToCloudinary } from "@/features/feedback/feedback.upload";
import Image from "next/image";

const POST_TYPES: {
  value: FeedbackPostType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "feature_request",
    label: "Feature",
    icon: <Lightbulb size={14} strokeWidth={2} />,
    description: "New capability",
  },
  {
    value: "bug_report",
    label: "Bug",
    icon: <Bug size={14} strokeWidth={2} />,
    description: "Something broken",
  },
  {
    value: "improvement",
    label: "Improvement",
    icon: <Sparkles size={14} strokeWidth={2} />,
    description: "Make it better",
  },
  {
    value: "question",
    label: "Question",
    icon: <HelpCircle size={14} strokeWidth={2} />,
    description: "Need clarity",
  },
];

interface ImagePreview {
  localUrl: string;
  cloudUrl?: string;
  uploading: boolean;
  error: boolean;
}

// ── Image carousel ─────────────────────────────────────────────────────────────

function ImageCarousel({
  images,
  onRemove,
}: {
  images: ImagePreview[];
  onRemove: (idx: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) return null;

  const current = images[Math.min(activeIdx, images.length - 1)];
  const safeIdx = Math.min(activeIdx, images.length - 1);

  return (
    <div className="space-y-2">
      {/* Main preview */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/[0.08] bg-neutral-900">
        <Image
          src={current.localUrl}
          alt=""
          className="w-full h-full object-contain"
        />

        {/* Uploading overlay */}
        {current.uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-white" />
            <span className="text-[12px] text-white font-medium">
              Uploading...
            </span>
          </div>
        )}

        {/* Error overlay */}
        {current.error && (
          <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center">
            <span className="text-[12px] text-red-400 font-medium">
              Upload failed
            </span>
          </div>
        )}

        {/* Nav arrows — only if multiple */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/80 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() =>
                setActiveIdx((i) => Math.min(images.length - 1, i + 1))
              }
              disabled={safeIdx === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/80 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}

        {/* Remove current */}
        <button
          onClick={() => {
            onRemove(safeIdx);
            setActiveIdx((i) => Math.max(0, i - 1));
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all"
        >
          <X size={11} className="text-white" />
        </button>

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/60 text-[11px] text-white font-medium">
            {safeIdx + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "relative w-12 h-12 rounded-lg overflow-hidden border shrink-0 transition-all",
                i === safeIdx
                  ? "border-blue-500/60 ring-1 ring-blue-500/30"
                  : "border-white/[0.08] opacity-50 hover:opacity-80",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.localUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {img.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={10} className="animate-spin text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main sheet ─────────────────────────────────────────────────────────────────

export function CreatePostSheet() {
  const open = useUIStore((s) => s.feedbackCreateOpen);
  const setOpen = useUIStore((s) => s.setFeedbackCreateOpen);

  const [type, setType] = useState<FeedbackPostType>("feature_request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  const reset = useCallback(() => {
    setType("feature_request");
    setTitle("");
    setDescription("");
    setImages([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    setOpen(false);
  }, [reset, setOpen]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      const toUpload = files.slice(0, 5 - images.length);

      const previews: ImagePreview[] = toUpload.map((file) => ({
        localUrl: URL.createObjectURL(file),
        uploading: true,
        error: false,
      }));

      setImages((prev) => [...prev, ...previews]);

      toUpload.forEach(async (file, idx) => {
        const previewIdx = images.length + idx;
        try {
          const cloudUrl = await uploadToCloudinary(file);
          setImages((prev) =>
            prev.map((img, i) =>
              i === previewIdx ? { ...img, cloudUrl, uploading: false } : img,
            ),
          );
        } catch {
          setImages((prev) =>
            prev.map((img, i) =>
              i === previewIdx
                ? { ...img, uploading: false, error: true }
                : img,
            ),
          );
        }
      });

      e.target.value = "";
    },
    [images.length],
  );

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx]?.localUrl ?? "");
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const isUploading = images.some((img) => img.uploading);
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !isUploading &&
    !isPending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const dto: CreateFeedbackPostDto = {
      title: title.trim(),
      description: description.trim(),
      type,
      attachments: images
        .filter((img) => img.cloudUrl)
        .map((img) => img.cloudUrl!),
    };
    createPost(dto, { onSuccess: handleClose });
  }, [canSubmit, title, description, type, images, createPost, handleClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed z-50",
          "bg-[#161514] border border-white/[0.08]",
          "shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)]",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-2xl max-h-[92dvh] overflow-y-auto",
          // Desktop: centered dialog
          "md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[500px] md:max-h-[85dvh] md:rounded-2xl md:overflow-y-auto",
        )}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-8 h-1 rounded-full bg-white/[0.12]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-semibold text-neutral-100">
            Share feedback
          </h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Type selector — icon cards */}
          <div className="grid grid-cols-4 gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border",
                  "text-center transition-all duration-150 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  type === t.value
                    ? "border-white/[0.15] bg-white/[0.06] text-neutral-100"
                    : "border-white/[0.05] text-neutral-500 hover:border-white/[0.1] hover:text-neutral-300",
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    type === t.value
                      ? "bg-white/[0.08]"
                      : "bg-white/[0.03]",
                  )}
                >
                  {t.icon}
                </span>
                <span className="text-[11px] font-medium leading-none">
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, descriptive title"
              maxLength={255}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-[13.5px] font-medium",
                "bg-white/[0.03] border border-white/[0.06]",
                "text-neutral-100 placeholder:text-neutral-600",
                "focus:border-white/[0.15] focus:bg-white/[0.04]",
                "outline-none transition-all",
              )}
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe in detail. What problem does it solve? What did you expect?"
            rows={4}
            className={cn(
              "w-full px-4 py-3 rounded-xl text-[13px] resize-none",
              "bg-white/[0.03] border border-white/[0.06]",
              "text-neutral-300 placeholder:text-neutral-600",
              "focus:border-white/[0.15] focus:bg-white/[0.04]",
              "outline-none transition-all leading-relaxed",
            )}
          />

          {/* Image carousel */}
          <ImageCarousel images={images} onRemove={removeImage} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5 pt-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 5}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium",
              "border border-white/[0.06] text-neutral-400",
              "hover:bg-white/[0.03] hover:text-neutral-200",
              "transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed",
            )}
          >
            <ImagePlus size={13} />
            {images.length > 0 ? `${images.length}/5 images` : "Add images"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold",
              "bg-white text-neutral-900",
              "hover:bg-neutral-100 active:scale-[0.97]",
              "transition-all duration-150",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
            )}
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Post feedback
          </button>
        </div>
      </div>
    </>
  );
}