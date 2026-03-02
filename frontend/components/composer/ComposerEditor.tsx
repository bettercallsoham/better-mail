"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconBlockquote,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconList,
  IconListNumbers,
  IconLink,
  IconUnlink,
  IconCheck,
  IconX,
  IconSparkles,
  IconLoader2,
  IconWand,
} from "@tabler/icons-react";
import { QuotedThread } from "./QuotedThread";
import { VariablesBanner } from "./VariablesBanner";
import { TemplateSlashExtension } from "./TemplateSlashExtension";
import { useSuggestEmail } from "@/features/ai/ai.query";
import { stripHtml } from "@/lib/utils/stripHtml";
import type { SuggestEmailTone } from "@/features/ai/ai.type";

const AI_TONES: Array<{ value: SuggestEmailTone; label: string }> = [
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "professional", label: "Professional" },
  { value: "empathetic", label: "Empathetic" },
];

interface Props {
  instance:    ComposerInstance;
  placeholder?: string;
  minHeight?:  number;
  className?:  string;
}

export function ComposerEditor({
  instance,
  placeholder = "Write your reply…",
  minHeight   = 120,
  className,
}: Props) {
  const store = useComposerStore();

  // ── Link input state ──────────────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl,  setLinkUrl]  = useState("");
  const linkInputRef            = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
      Underline,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      TemplateSlashExtension.configure({ instanceId: instance.id }),
    ],
    content: instance.html || "",
    onUpdate: ({ editor }) => {
      store.setHtml(instance.id, editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "outline-none prose prose-sm max-w-none dark:prose-invert",
          "prose-p:my-1.5 prose-p:leading-relaxed",
          "text-[13.5px] text-gray-800 dark:text-white/85",
        ),
      },
    },
  });

  // Auto-focus on reply/forward
  useEffect(() => {
    if (editor && instance.mode !== "new") {
      setTimeout(() => editor.commands.focus("end"), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Apply pendingTemplate when the footer sets one via the store bridge
  useEffect(() => {
    if (!editor || !instance.pendingTemplate) return;
    const template = instance.pendingTemplate;

    // Clear immediately to prevent re-runs
    store.clearPendingTemplate(instance.id);

    const body = template.body ?? "";
    editor.commands.setContent(body);

    const patch: Partial<ComposerInstance> = { html: body };
    if (instance.mode === "new") patch.subject = template.subject;
    store.update(instance.id, patch);

    if (template.variables && template.variables.length > 0) {
      store.setPendingVariables(instance.id, template.variables);
    }
  // editor identity doesn't change; only react to pendingTemplate changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance.pendingTemplate]);

  // Pre-fill URL input when editing an existing link
  const openLinkInput = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [editor]);

  const commitLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setLinkOpen(false);
    setLinkUrl("");
    editor?.commands.focus();
  }, [editor]);

  const handleLinkKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter")  { e.preventDefault(); commitLink(); }
      if (e.key === "Escape") { e.preventDefault(); cancelLink(); }
    },
    [commitLink, cancelLink],
  );

  // Resolve {{var}} placeholders from VariablesBanner
  const handleApplyVariables = useCallback(
    (vals: Record<string, string>) => {
      if (!editor) return;
      let html = editor.getHTML();
      for (const [name, value] of Object.entries(vals)) {
        html = html.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), value);
      }
      editor.commands.setContent(html);
      store.update(instance.id, { html });
      store.clearPendingVariables(instance.id);
    },
    [editor, store, instance.id],
  );

  // v3 requires useEditorState for reactive isActive()
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold:        ctx.editor?.isActive("bold")                    ?? false,
      isItalic:      ctx.editor?.isActive("italic")                  ?? false,
      isUnderline:   ctx.editor?.isActive("underline")               ?? false,
      isStrike:      ctx.editor?.isActive("strike")                  ?? false,
      isH1:          ctx.editor?.isActive("heading", { level: 1 })   ?? false,
      isH2:          ctx.editor?.isActive("heading", { level: 2 })   ?? false,
      isBlockquote:  ctx.editor?.isActive("blockquote")              ?? false,
      isAlignLeft:   ctx.editor?.isActive({ textAlign: "left" })     ?? false,
      isAlignCenter: ctx.editor?.isActive({ textAlign: "center" })   ?? false,
      isAlignRight:  ctx.editor?.isActive({ textAlign: "right" })    ?? false,
      isBulletList:  ctx.editor?.isActive("bulletList")              ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList")             ?? false,
      isLink:        ctx.editor?.isActive("link")                    ?? false,
    }),
  });

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      <BubbleMenu
        editor={editor}
        options={{ placement: "top-start", offset: 6 }}
        className={cn(
          "flex items-center gap-0.5 p-1 rounded-xl z-50",
          "bg-white dark:bg-[#27241f]",
          "shadow-[0_4px_20px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.07)]",
        )}
      >
        {linkOpen ? (
          /* ── Link URL input inline in the BubbleMenu ───────────────────── */
          <>
            <input
              ref={linkInputRef}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder="https://…"
              className={cn(
                "h-7 w-48 px-2 rounded-lg text-[12px] outline-none",
                "bg-gray-50 dark:bg-white/[0.07]",
                "text-gray-800 dark:text-white/85",
                "placeholder:text-gray-300 dark:placeholder:text-white/25",
                "border border-black/[0.08] dark:border-white/[0.1]",
              )}
            />
            <Btn onClick={commitLink} title="Apply link (Enter)">
              <IconCheck size={13} />
            </Btn>
            <Btn onClick={cancelLink} title="Cancel (Esc)">
              <IconX size={13} />
            </Btn>
          </>
        ) : (
          /* ── Normal formatting buttons ─────────────────────────────────── */
          <>
            <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={state?.isH1}        title="Heading 1">       <IconH1          size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={state?.isH2}        title="Heading 2">       <IconH2          size={13} /></Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn onClick={() => editor.chain().focus().toggleBold().run()}                active={state?.isBold}       title="Bold ⌘B">        <IconBold         size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleItalic().run()}              active={state?.isItalic}     title="Italic ⌘I">      <IconItalic       size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}           active={state?.isUnderline}  title="Underline ⌘U">   <IconUnderline    size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleStrike().run()}              active={state?.isStrike}     title="Strikethrough">  <IconStrikethrough size={13} /></Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}          active={state?.isBulletList}  title="Bullet list">    <IconList         size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}         active={state?.isOrderedList} title="Numbered list">  <IconListNumbers  size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}          active={state?.isBlockquote}  title="Blockquote">     <IconBlockquote   size={13} /></Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()}   active={state?.isAlignLeft}   title="Align left">    <IconAlignLeft   size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={state?.isAlignCenter} title="Align center">  <IconAlignCenter size={13} /></Btn>
            <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()}  active={state?.isAlignRight}  title="Align right">   <IconAlignRight  size={13} /></Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn
              onClick={state?.isLink ? () => editor.chain().focus().unsetLink().run() : openLinkInput}
              active={state?.isLink}
              title={state?.isLink ? "Remove link" : "Add link"}
            >
              {state?.isLink ? <IconUnlink size={13} /> : <IconLink size={13} />}
            </Btn>
          </>
        )}
      </BubbleMenu>

      {/* Variable fill-in banner — shown when a template with {{vars}} was inserted */}
      {instance.pendingVariables && instance.pendingVariables.length > 0 && (
        <VariablesBanner
          variables={instance.pendingVariables}
          onApply={handleApplyVariables}
          onDismiss={() => store.clearPendingVariables(instance.id)}
        />
      )}

      {/* Inline AI bar — shown when sparkle button in footer is active */}
      {instance.aiPanelOpen && (
        <InlineAIBar
          instance={instance}
          onClose={() => store.update(instance.id, { aiPanelOpen: false })}
        />
      )}

      {/* Clicking empty space below the editor text focuses it */}
      <div
        style={{ minHeight }}
        onClick={() => editor.commands.focus("end")}
      >
        {/* stopPropagation so clicking inside the editor doesn't jump cursor to end */}
        <div onClick={(e) => e.stopPropagation()}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {instance.quotedHtml && <QuotedThread html={instance.quotedHtml} />}
    </div>
  );
}

// ─── Inline AI bar ─────────────────────────────────────────────────────────────
function InlineAIBar({
  instance,
  onClose,
}: {
  instance: ComposerInstance;
  onClose: () => void;
}) {
  const store = useComposerStore();
  const { mutateAsync, isPending } = useSuggestEmail();

  const draftText = stripHtml(instance.html).trim();
  const hasContent = !!draftText;
  const mode = hasContent ? "rewrite" : "compose";

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<SuggestEmailTone | undefined>(undefined);
  const topicRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === "compose") setTimeout(() => topicRef.current?.focus(), 50);
  }, [mode]);

  const canSubmit = mode === "rewrite" || topic.trim().length > 0;

  const handleGenerate = async () => {
    if (!canSubmit || isPending) return;
    try {
      const result = await mutateAsync({
        mode,
        topic: mode === "compose" ? topic.trim() : undefined,
        draft: mode === "rewrite" ? draftText : undefined,
        tone,
        subjectHint: instance.subject || undefined,
      });
      store.setPendingTemplate(instance.id, {
        id: -1,
        userId: "",
        name: "",
        subject: result.subject || instance.subject,
        body: result.body,
        variables: [],
        category: null,
        tags: [],
        usageCount: 0,
        version: 1,
        createdAt: "",
        updatedAt: "",
      });
      if (mode === "compose" && result.subject) {
        store.update(instance.id, { subject: result.subject });
      }
      onClose();
    } catch {
      // silent — user can retry
    }
  };

  return (
    <div
      className={cn(
        "shrink-0 border-b border-black/[0.06] dark:border-white/[0.06]",
        "bg-white dark:bg-[#1a1a1a]",
      )}
    >
      {/* Violet accent line */}
      <div className="h-[2px] bg-gradient-to-r from-violet-500 via-violet-400 to-indigo-400" />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 rounded-md bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
            {mode === "compose" ? (
              <IconSparkles size={11} className="text-violet-500 dark:text-violet-400" />
            ) : (
              <IconWand size={11} className="text-violet-500 dark:text-violet-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-gray-700 dark:text-white/70 leading-none">
              {mode === "compose" ? "Write with AI" : "Rewrite with AI"}
            </p>
            {mode === "rewrite" && (
              <p className="text-[10.5px] text-gray-400 dark:text-white/28 mt-0.5">
                Rewrites your current draft
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 dark:text-white/22 hover:text-gray-500 dark:hover:text-white/45 transition-colors"
          >
            <IconX size={13} />
          </button>
        </div>

        {/* Topic textarea — compose mode only */}
        {mode === "compose" && (
          <textarea
            ref={topicRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerate();
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder="What's this email about?"
            rows={2}
            className={cn(
              "w-full px-3 py-2 rounded-xl text-[12.5px] outline-none mb-2.5 resize-none",
              "bg-gray-50 dark:bg-white/[0.04]",
              "border border-black/[0.07] dark:border-white/[0.08]",
              "text-gray-800 dark:text-white/80",
              "placeholder:text-gray-300 dark:placeholder:text-white/22",
              "focus:border-violet-300 dark:focus:border-violet-700/50",
              "transition-colors",
            )}
          />
        )}

        {/* Tone pills */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {AI_TONES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTone(tone === value ? undefined : value)}
              className={cn(
                "h-6 px-2.5 rounded-lg text-[11.5px] font-medium transition-all",
                tone === value
                  ? "bg-violet-500 text-white shadow-sm"
                  : "bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-white/40 hover:bg-black/[0.07] dark:hover:bg-white/[0.1] hover:text-gray-700 dark:hover:text-white/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-7 px-3 rounded-lg text-[12px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canSubmit || isPending}
            className={cn(
              "h-7 px-3.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5",
              "bg-violet-500 hover:bg-violet-600 text-white shadow-sm",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {isPending ? (
              <>
                <IconLoader2 size={12} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <IconSparkles size={12} />{" "}
                {mode === "compose" ? "Generate" : "Rewrite"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bubble button ─────────────────────────────────────────────────────────────
function Btn({
  children, onClick, active, title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-gray-100 dark:bg-white/[0.12] text-gray-900 dark:text-white"
          : "text-gray-500 dark:text-white/45 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-800 dark:hover:text-white/75",
      )}
    >
      {children}
    </button>
  );
}
