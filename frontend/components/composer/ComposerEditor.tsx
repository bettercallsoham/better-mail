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
} from "@tabler/icons-react";
import { QuotedThread } from "./QuotedThread";
import { VariablesBanner } from "./VariablesBanner";
import { TemplateSlashExtension } from "./TemplateSlashExtension";
import { stripHtml } from "@/lib/utils/stripHtml";

interface Props {
  instance: ComposerInstance;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export function ComposerEditor({
  instance,
  placeholder = "Write your reply…",
  minHeight = 120,
  className,
}: Props) {
  const store = useComposerStore();

  // ── Link input state ──────────────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

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
      if (e.key === "Enter") {
        e.preventDefault();
        commitLink();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelLink();
      }
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
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isUnderline: ctx.editor?.isActive("underline") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isH1: ctx.editor?.isActive("heading", { level: 1 }) ?? false,
      isH2: ctx.editor?.isActive("heading", { level: 2 }) ?? false,
      isBlockquote: ctx.editor?.isActive("blockquote") ?? false,
      isAlignLeft: ctx.editor?.isActive({ textAlign: "left" }) ?? false,
      isAlignCenter: ctx.editor?.isActive({ textAlign: "center" }) ?? false,
      isAlignRight: ctx.editor?.isActive({ textAlign: "right" }) ?? false,
      isBulletList: ctx.editor?.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList") ?? false,
      isLink: ctx.editor?.isActive("link") ?? false,
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
            <Btn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={state?.isH1}
              title="Heading 1"
            >
              {" "}
              <IconH1 size={13} />
            </Btn>
            <Btn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={state?.isH2}
              title="Heading 2"
            >
              {" "}
              <IconH2 size={13} />
            </Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={state?.isBold}
              title="Bold ⌘B"
            >
              {" "}
              <IconBold size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={state?.isItalic}
              title="Italic ⌘I"
            >
              {" "}
              <IconItalic size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={state?.isUnderline}
              title="Underline ⌘U"
            >
              {" "}
              <IconUnderline size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={state?.isStrike}
              title="Strikethrough"
            >
              {" "}
              <IconStrikethrough size={13} />
            </Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={state?.isBulletList}
              title="Bullet list"
            >
              {" "}
              <IconList size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={state?.isOrderedList}
              title="Numbered list"
            >
              {" "}
              <IconListNumbers size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={state?.isBlockquote}
              title="Blockquote"
            >
              {" "}
              <IconBlockquote size={13} />
            </Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={state?.isAlignLeft}
              title="Align left"
            >
              {" "}
              <IconAlignLeft size={13} />
            </Btn>
            <Btn
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={state?.isAlignCenter}
              title="Align center"
            >
              {" "}
              <IconAlignCenter size={13} />
            </Btn>
            <Btn
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={state?.isAlignRight}
              title="Align right"
            >
              {" "}
              <IconAlignRight size={13} />
            </Btn>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Btn
              onClick={
                state?.isLink
                  ? () => editor.chain().focus().unsetLink().run()
                  : openLinkInput
              }
              active={state?.isLink}
              title={state?.isLink ? "Remove link" : "Add link"}
            >
              {state?.isLink ? (
                <IconUnlink size={13} />
              ) : (
                <IconLink size={13} />
              )}
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

      {/* Rich-text toolbar — shown when composer is a full dialog or panel */}
      {(instance.shell === "dialog" || instance.shell === "panel") && (
        <ComposerStaticToolbar editor={editor} />
      )}

      {/* Clicking empty space below the editor text focuses it */}
      <div style={{ minHeight }} onClick={() => editor.commands.focus("end")}>
        {/* stopPropagation for plain key presses — keeps d/e/r etc. from triggering
            global shortcuts while typing. Modifier combos (⌘↵, Ctrl+.) pass through
            so composer-scoped hotkeys in ComposerFooter still work. */}
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation();
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {instance.quotedHtml && <QuotedThread html={instance.quotedHtml} />}
    </div>
  );
}

// ─── Static rich-text toolbar (dialog / panel only) ─────────────────────────
function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
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

function ComposerStaticToolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-black/[0.06] dark:border-white/[0.07] overflow-x-auto">
      <ToolbarBtn
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <IconH1 size={12} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <IconH2 size={12} />
      </ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <IconBold size={12} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <IconItalic size={12} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <IconUnderline size={12} />
      </ToolbarBtn>
      <div className="w-px h-3.5 mx-1 bg-black/[0.08] dark:bg-white/[0.1]" />
      <ToolbarBtn
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <IconList size={12} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <IconListNumbers size={12} />
      </ToolbarBtn>
      <ToolbarBtn
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <IconBlockquote size={12} />
      </ToolbarBtn>
    </div>
  );
}

// ─── Bubble menu button ───────────────────────────────────────────────────────
function Btn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
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
