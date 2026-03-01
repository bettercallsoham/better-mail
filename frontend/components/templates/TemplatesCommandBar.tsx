"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import {
  IconArrowLeft,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBlockquote,
  IconBold,
  IconH1,
  IconH2,
  IconItalic,
  IconList,
  IconListNumbers,
  IconMinus,
  IconPlus,
  IconTrash,
  IconUnderline,
  IconX,
} from "@tabler/icons-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { cn } from "@/lib/utils";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/features/templates/templates.query";
import type {
  Template,
  TemplateVariable,
} from "@/features/templates/templates.types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

// ─── Variable decoration extension ─────────────────────────────────────────────
// ProseMirror plugin that adds an amber chip class to any {{varname}} found in
// text nodes — purely visual, doesn't change the stored content.

const varPluginKey = new PluginKey("template-variable-decoration");

const VariableDecoration = Extension.create({
  name: "variableDecoration",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: varPluginKey,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            const re = /\{\{(\w+)\}\}/g;
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              re.lastIndex = 0;
              let m: RegExpExecArray | null;
              while ((m = re.exec(node.text)) !== null) {
                decos.push(
                  Decoration.inline(
                    pos + m.index,
                    pos + m.index + m[0].length,
                    { class: "var-chip" },
                  ),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

// ─── Toolbar ────────────────────────────────────────────────────────────────────
function ToolbarBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep editor focused
        onClick();
      }}
      className={cn(
        "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
        active
          ? "bg-black/[0.07] dark:bg-white/[0.1] text-gray-800 dark:text-white/80"
          : "text-gray-400 dark:text-white/35 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-700 dark:hover:text-white/65",
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-black/[0.06] dark:border-white/[0.07] overflow-x-auto">
      <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><IconH1 size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><IconH2 size={12} /></ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}>      <IconBold      size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}>    <IconItalic    size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><IconUnderline size={12} /></ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}>  <IconList        size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><IconListNumbers size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive("blockquote")}  onClick={() => editor.chain().focus().toggleBlockquote().run()}><IconBlockquote  size={12} /></ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn active={editor.isActive({ textAlign: "left" })}   onClick={() => editor.chain().focus().setTextAlign("left").run()}>  <IconAlignLeft   size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><IconAlignCenter size={12} /></ToolbarBtn>
      <ToolbarBtn active={editor.isActive({ textAlign: "right" })}  onClick={() => editor.chain().focus().setTextAlign("right").run()}> <IconAlignRight  size={12} /></ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}><IconMinus size={12} /></ToolbarBtn>
      {/* Undo / Redo pushed to the right */}
      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()}><IconArrowBackUp    size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()}><IconArrowForwardUp size={12} /></ToolbarBtn>
      </div>
    </div>
  );
}

// ─── Rich text body editor ──────────────────────────────────────────────────────
function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const prevValueRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          "Write your template body here.\nUse {{variable_name}} for dynamic placeholders.",
      }),
      Underline,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      VariableDecoration,
    ],
    content: value,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      prevValueRef.current = html;
      onChange(html);
    },
  });

  // Sync when the form loads a different template (editing changes)
  useEffect(() => {
    if (!editor) return;
    if (value !== prevValueRef.current) {
      editor.commands.setContent(value || "");
      prevValueRef.current = value;
    }
  }, [editor, value]);

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden",
        "border border-black/[0.08] dark:border-white/[0.09]",
        "bg-gray-50 dark:bg-white/[0.04]",
        // Variable chips
        "[&_.var-chip]:bg-amber-50 dark:[&_.var-chip]:bg-amber-400/[0.14]",
        "[&_.var-chip]:text-amber-600 dark:[&_.var-chip]:text-amber-400/90",
        "[&_.var-chip]:rounded [&_.var-chip]:font-medium [&_.var-chip]:text-[0.85em]",
        // ProseMirror content area
        "[&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2.5 [&_.ProseMirror]:min-h-[200px]",
        "[&_.ProseMirror]:max-h-[300px] [&_.ProseMirror]:overflow-y-auto",
        "[&_.ProseMirror]:outline-none",
        "[&_.ProseMirror]:text-[13px] [&_.ProseMirror]:leading-relaxed",
        "[&_.ProseMirror]:text-gray-800 dark:[&_.ProseMirror]:text-white/80",
        // Lists
        "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4",
        "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4",
        // Headings
        "[&_.ProseMirror_h1]:text-[1.2em] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-1",
        "[&_.ProseMirror_h2]:text-[1.05em] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-0.5",
        // Blockquote
        "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-gray-200 dark:[&_.ProseMirror_blockquote]:border-white/20",
        "[&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-gray-500 dark:[&_.ProseMirror_blockquote]:text-white/50",
        // Horizontal rule
        "[&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-black/[0.08] dark:[&_.ProseMirror_hr]:border-white/[0.1] [&_.ProseMirror_hr]:my-2",
        // Placeholder
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-300",
        "dark:[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-white/20",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
        "[&_.ProseMirror_p.is-editor-empty:first-child::before]:whitespace-pre-line",
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Template list (inside Suspense) ───────────────────────────────────────────
function TemplateList({
  search,
  onEdit,
  onCreate,
}: {
  search: string;
  onEdit: (t: Template) => void;
  onCreate: () => void;
}) {
  const { data } = useTemplates(search ? { search } : undefined);
  const templates = data?.templates ?? [];
  const deleteTemplate = useDeleteTemplate();
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  if (templates.length === 0 && !search) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <p className="text-[13px] text-gray-400 dark:text-white/30">
          No templates yet
        </p>
        <button
          onClick={onCreate}
          className="text-[12.5px] font-medium text-gray-500 dark:text-white/40 underline underline-offset-2 hover:text-gray-700 dark:hover:text-white/60 transition-colors"
        >
          Create your first
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-gray-400 dark:text-white/30">
        No templates match your search
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {templates.map((t) => (
        <div
          key={t.id}
          onClick={() => onEdit(t)}
          className={cn(
            "group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
            "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
            "border-b border-black/[0.04] dark:border-white/[0.04] last:border-0",
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-800 dark:text-white/82 truncate leading-snug">
              {t.name}
            </p>
            <p className="text-[11.5px] text-gray-400 dark:text-white/35 truncate mt-0.5">
              {t.subject}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {t.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.07] text-gray-400 dark:text-white/40 font-medium">
                {t.category}
              </span>
            )}
            <button
              onClick={(e) => handleDelete(e, t.id)}
              disabled={deleting === t.id}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              {deleting === t.id ? (
                <span className="text-[9px]">…</span>
              ) : (
                <IconTrash size={12} />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 space-y-1.5 animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="h-3 w-1/3 bg-black/[0.06] dark:bg-white/[0.06] rounded" />
          <div className="h-2.5 w-1/2 bg-black/[0.04] dark:bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Form view (create or edit) ────────────────────────────────────────────────
function detectVariables(html: string): TemplateVariable[] {
  // Strip HTML tags first so we only match {{var}} in actual text content
  const text = html.replace(/<[^>]*>/g, "");
  const seen = new Set<string>();
  const out: TemplateVariable[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push({ name: m[1] });
    }
  }
  return out;
}

function TemplateForm({
  template,
  onBack,
  onSaved,
}: {
  template?: Template;
  onBack: () => void;
  onSaved?: () => void;
}) {
  const isEdit = !!template;
  const create = useCreateTemplate();
  const update = useUpdateTemplate(template?.id ?? 0);

  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [tags, setTags] = useState<string[]>(template?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const detectedVars = detectVariables(body);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const isPending = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      body: body || undefined,
      category: category.trim() || undefined,
      tags: tags.length ? tags : undefined,
      variables: detectedVars.length ? detectedVars : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast.success("Template saved");
      } else {
        await create.mutateAsync(payload);
        toast.success("Template created");
      }
      onSaved?.();
      onBack();
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto">
      {/* Name + Subject — side by side on sm+, stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className={labelClass}>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Follow-up after meeting"
            autoFocus
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className={labelClass}>Subject *</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Re: Great talking with you"
            className={inputClass}
          />
        </div>
      </div>

      {/* Body with variable highlighting */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Body</label>
          {detectedVars.length > 0 && (
            <span className="text-[10.5px] text-amber-600 dark:text-amber-400/70 font-medium">
              {detectedVars.length} variable{detectedVars.length > 1 ? "s" : ""}{" "}
              detected
            </span>
          )}
        </div>
        <BodyEditor value={body} onChange={setBody} />
      </div>

      {/* Category + Tags — collapsible row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className={labelClass}>Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Sales"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className={labelClass}>Tags</label>
          <div className="flex gap-1.5 items-center">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add, press Enter"
              className={cn(inputClass, "flex-1")}
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                  className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.07] text-gray-500 dark:text-white/45 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  #{tag} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onBack}
          className="h-8 px-4 text-[12.5px] text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/55 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !subject.trim() || isPending}
          className={cn(
            "h-8 px-5 rounded-xl text-[12.5px] font-semibold transition-all",
            "bg-gray-950 dark:bg-white text-white dark:text-gray-950",
            "hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.97]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </button>
      </div>
    </div>
  );
}

// ─── Shell ─────────────────────────────────────────────────────────────────────
export function TemplatesCommandBar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Template | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSearch("");
        setView("list");
        setEditing(undefined);
      }, 200);
    } else {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "form") setView("list");
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, view, onClose]);

  const openEdit = useCallback((t: Template) => {
    setEditing(t);
    setView("form");
  }, []);

  const openCreate = useCallback(() => {
    setEditing(undefined);
    setView("form");
  }, []);

  const goBack = useCallback(() => {
    setView("list");
    setEditing(undefined);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/30 dark:bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed z-[201] left-1/2 -translate-x-1/2 top-[8vh] sm:top-[12vh]",
              "w-[calc(100vw-1.5rem)] sm:w-[680px] max-h-[85vh] sm:max-h-[80vh] flex flex-col rounded-xl sm:rounded-2xl overflow-hidden",
              "bg-white dark:bg-[#191919]",
              "border border-black/[0.07] dark:border-white/[0.08]",
              "shadow-[0_24px_80px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.05)]",
              "dark:shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06]">
              {view === "form" && (
                <button
                  onClick={goBack}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                >
                  <IconArrowLeft size={14} />
                </button>
              )}

              {view === "list" ? (
                <>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="flex-1 text-[13px] bg-transparent outline-none text-gray-800 dark:text-white/80 placeholder:text-gray-300 dark:placeholder:text-white/25"
                  />
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-medium text-gray-500 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-700 dark:hover:text-white/65 transition-colors"
                  >
                    <IconPlus size={13} />
                    New
                  </button>
                  <div className="w-px h-4 bg-black/[0.07] dark:bg-white/[0.08]" />
                </>
              ) : (
                <p className="flex-1 text-[13px] font-semibold text-gray-700 dark:text-white/75">
                  {editing ? "Edit template" : "New template"}
                </p>
              )}

              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/30 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-gray-600 dark:hover:text-white/55 transition-colors"
              >
                <IconX size={13} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                {view === "list" ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<ListSkeleton />}>
                      <TemplateList
                        search={search}
                        onEdit={openEdit}
                        onCreate={openCreate}
                      />
                    </Suspense>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TemplateForm template={editing} onBack={goBack} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            {view === "list" && (
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-[10.5px] text-gray-300 dark:text-white/20">
                  Click a template to edit
                </span>
                <kbd className="text-[10px] font-mono text-gray-300 dark:text-white/20 bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-0.5 rounded">
                  Alt T
                </kbd>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const labelClass =
  "text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/35";

const inputClass = cn(
  "h-8 px-3 rounded-lg text-[13px] outline-none w-full",
  "bg-gray-50 dark:bg-white/[0.04]",
  "border border-black/[0.08] dark:border-white/[0.09]",
  "text-gray-800 dark:text-white/80",
  "placeholder:text-gray-300 dark:placeholder:text-white/22",
  "focus:border-gray-300 dark:focus:border-white/20",
  "transition-colors",
);
