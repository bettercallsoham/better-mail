"use client";

import { useEffect, useState, useRef } from "react";
import { IconX, IconPlus, IconTrash } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type {
  Template,
  TemplateVariable,
} from "@/features/templates/templates.types";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/features/templates/templates.query";
import { toast } from "sonner";

interface TemplateFormSheetProps {
  template?: Template;
  onClose: () => void;
}

function detectVariables(body: string): TemplateVariable[] {
  const regex = /\{\{(\w+)\}\}/g;
  const seen = new Set<string>();
  const vars: TemplateVariable[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      vars.push({ name: match[1] });
    }
  }
  return vars;
}

export function TemplateFormSheet({
  template,
  onClose,
}: TemplateFormSheetProps) {
  const isEdit = !!template;
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate(template?.id ?? 0);

  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(template?.tags ?? []);
  const [detectedVars, setDetectedVars] = useState<TemplateVariable[]>([]);

  // Detect variables from body when focus leaves the textarea
  const handleBodyBlur = () => {
    setDetectedVars(detectVariables(body));
  };

  // Also detect on initial load if editing
  useEffect(() => {
    if (template?.body) setDetectedVars(detectVariables(template.body));
  }, [template?.body]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  const handleSubmit = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      body: body || undefined,
      category: category.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      variables: detectedVars.length > 0 ? detectedVars : undefined,
    };
    try {
      if (isEdit) {
        await updateTemplate.mutateAsync(payload);
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync(payload);
        toast.success("Template created");
      }
      onClose();
    } catch {
      toast.error(
        isEdit ? "Failed to update template" : "Failed to create template",
      );
    }
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className={cn(
          "relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden",
          "bg-white dark:bg-[#1c1a18]",
          "shadow-[0_24px_80px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.7)]",
          "border border-black/[0.07] dark:border-white/[0.07]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-white/85">
            {isEdit ? "Edit template" : "New template"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60 transition-colors"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <Field label="Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Follow-up after meeting"
              className={inputClass}
            />
          </Field>

          {/* Subject */}
          <Field label="Subject *">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Re: Great talking with you"
              className={inputClass}
            />
          </Field>

          {/* Category */}
          <Field label="Category">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Sales, Support, Outreach…"
              className={inputClass}
            />
          </Field>

          {/* Tags */}
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.08] text-gray-600 dark:text-white/60 font-mono"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <IconTrash size={9} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag and press Enter"
                className={cn(inputClass, "flex-1")}
              />
              <button
                onClick={addTag}
                className="h-8 px-3 rounded-lg text-[12px] border border-black/[0.08] dark:border-white/[0.1] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
              >
                <IconPlus size={13} />
              </button>
            </div>
          </Field>

          {/* Body */}
          <Field label="Body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={handleBodyBlur}
              placeholder={
                "Write your template body here.\nUse {{variable_name}} for dynamic fields."
              }
              rows={8}
              className={cn(
                inputClass,
                "resize-y min-h-[120px] font-mono text-[12.5px] leading-relaxed",
              )}
            />
          </Field>

          {/* Detected variables */}
          {detectedVars.length > 0 && (
            <div
              className={cn(
                "rounded-xl p-3",
                "bg-amber-50/80 dark:bg-amber-500/[0.05]",
                "border border-amber-200/60 dark:border-amber-500/[0.15]",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400/70 mb-2">
                Detected variables
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedVars.map((v) => (
                  <span
                    key={v.name}
                    className="text-[12px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300/70 font-mono"
                  >
                    {`{{${v.name}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-[12.5px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 border border-black/[0.08] dark:border-white/[0.09] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !subject.trim() || isPending}
            className={cn(
              "h-8 px-4 rounded-lg text-[12.5px] font-semibold transition-all",
              "bg-gray-950 dark:bg-white text-white dark:text-gray-950",
              "hover:bg-gray-800 dark:hover:bg-gray-100",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = cn(
  "w-full h-8 px-3 rounded-lg text-[13px] outline-none",
  "bg-gray-50 dark:bg-white/[0.04]",
  "border border-black/[0.08] dark:border-white/[0.09]",
  "text-gray-800 dark:text-white/80",
  "placeholder:text-gray-300 dark:placeholder:text-white/20",
  "focus:border-gray-300 dark:focus:border-white/20",
  "transition-colors",
);
