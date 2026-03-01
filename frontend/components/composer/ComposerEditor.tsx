"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
// v3: BubbleMenu moved to @tiptap/react/menus, needs @floating-ui/dom installed
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import {
  useComposerStore,
  type ComposerInstance,
} from "@/lib/store/composer.store";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconList,
  IconListNumbers,
  IconLink,
  IconUnlink,
} from "@tabler/icons-react";
import { QuotedThread } from "./QuotedThread";

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

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
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

  // v3 requires useEditorState for reactive isActive() — plain editor.isActive() is NOT reactive
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isBulletList: ctx.editor?.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList") ?? false,
      isLink: ctx.editor?.isActive("link") ?? false,
    }),
  });

  const toggleLink = useCallback(() => {
    if (!editor) return;
    if (state?.isLink) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("URL:");
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor, state?.isLink]);

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* BubbleMenu — shows on text selection.
          v3 API: options.placement, options.offset instead of tippyOptions */}
      <BubbleMenu
        editor={editor}
        options={{ placement: "top-start", offset: 6 }}
        className={cn(
          "flex items-center gap-0.5 p-1 rounded-xl z-50",
          "bg-white dark:bg-[#1c1c1c]",
          "shadow-[0_4px_20px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.07)]",
        )}
      >
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={state?.isBold}
          title="Bold ⌘B"
        >
          <IconBold size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={state?.isItalic}
          title="Italic ⌘I"
        >
          <IconItalic size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={state?.isStrike}
          title="Strikethrough"
        >
          <IconStrikethrough size={13} />
        </Btn>
        <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={state?.isBulletList}
          title="Bullet list"
        >
          <IconList size={13} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={state?.isOrderedList}
          title="Numbered list"
        >
          <IconListNumbers size={13} />
        </Btn>
        <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
        <Btn
          onClick={toggleLink}
          active={state?.isLink}
          title={state?.isLink ? "Remove link" : "Add link"}
        >
          {state?.isLink ? <IconUnlink size={13} /> : <IconLink size={13} />}
        </Btn>
      </BubbleMenu>

      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* Quoted thread — collapsible */}
      {instance.quotedHtml && <QuotedThread html={instance.quotedHtml} />}
    </div>
  );
}

// ─── Bubble button ────────────────────────────────────────────────────────────

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
