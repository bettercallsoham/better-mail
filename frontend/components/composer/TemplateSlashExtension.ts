"use client";

import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { createRoot, type Root } from "react-dom/client";
import { createElement, Suspense } from "react";
import { TemplatePicker } from "./TemplatePicker";
import { useComposerStore } from "@/lib/store/composer.store";
import type { Template } from "@/features/templates/templates.types";
import type { SuggestionProps } from "@tiptap/suggestion";

export interface TemplateSlashOptions {
  instanceId: string;
}

export const TemplateSlashExtension = Extension.create<TemplateSlashOptions>({
  name: "templateSlash",

  addOptions() {
    return { instanceId: "" };
  },

  addProseMirrorPlugins() {
    const instanceId = this.options.instanceId;

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        // Items are empty — selection is handled inside TemplatePicker
        items: () => [],
        // Command fires when a suggestion item is "selected" via keyboard.
        // We use it only to delete the trigger range; template application
        // goes through the store bridge so ComposerEditor can apply it to the editor.
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
        },
        render: () => {
          let container: HTMLDivElement | null = null;
          let root: Root | null = null;
          // Keep a ref to the latest props so we can re-position on update
          let latestProps: SuggestionProps | null = null;

          const position = () => {
            if (!container || !latestProps?.clientRect) return;
            const rect = latestProps.clientRect();
            if (!rect) return;

            // Prefer rendering below; fall back above if not enough space
            const spaceBelow = window.innerHeight - rect.bottom;
            const pickerH   = 320;
            const top = spaceBelow > pickerH
              ? rect.bottom + window.scrollY + 6
              : rect.top   + window.scrollY - pickerH - 6;

            container.style.top  = `${top}px`;
            container.style.left = `${Math.max(8, rect.left)}px`;
          };

          const renderInto = (props: SuggestionProps) => {
            if (!root || !container) return;
            root.render(
              createElement(
                Suspense,
                { fallback: null },
                createElement(TemplatePicker, {
                  onClose: () => {
                    // Exit the suggestion and return focus to the editor
                    props.editor.commands.focus();
                  },
                  onSelect: (template: Template) => {
                    // 1. Delete the "/" trigger range
                    props.command({ item: template });
                    // 2. Apply the template via the store bridge —
                    //    ComposerEditor's useEffect picks this up
                    useComposerStore
                      .getState()
                      .setPendingTemplate(instanceId, template);
                  },
                }),
              ),
            );
          };

          return {
            onStart: (props) => {
              latestProps = props;

              container = document.createElement("div");
              container.style.position = "absolute";
              container.style.zIndex   = "9999";
              document.body.appendChild(container);

              position();
              root = createRoot(container);
              renderInto(props);
            },

            onUpdate: (props) => {
              latestProps = props;
              position();
              renderInto(props);
            },

            onExit: () => {
              if (root) {
                root.unmount();
                root = null;
              }
              container?.remove();
              container     = null;
              latestProps   = null;
            },

            onKeyDown: (props) => {
              // Let Escape close the picker and return focus
              if (props.event.key === "Escape") {
                latestProps?.editor.commands.focus();
                return true;
              }
              return false;
            },
          };
        },
      }),
    ];
  },
});
