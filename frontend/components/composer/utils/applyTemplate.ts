import type { Editor } from "@tiptap/core";
import type { Template } from "@/features/templates/templates.types";
import type { ComposerInstance } from "@/lib/store/composer.store";
import type { useComposerStore } from "@/lib/store/composer.store";

type ComposerStore = ReturnType<typeof useComposerStore.getState>;

/**
 * Applies a template to a composer instance:
 * 1. Sets editor HTML content
 * 2. Updates store (subject for new mode, html always)
 * 3. Sets pending variables if template has any
 */
export function applyTemplate(
  template: Template,
  instance: ComposerInstance,
  editor: Editor,
  store: ComposerStore,
) {
  const body = template.body ?? "";

  // Set editor content
  editor.commands.setContent(body);

  // Sync to store
  const patch: Partial<ComposerInstance> = { html: body };
  if (instance.mode === "new") patch.subject = template.subject;
  store.update(instance.id, patch);

  // Trigger variable banner if template has variables
  if (template.variables && template.variables.length > 0) {
    store.setPendingVariables(instance.id, template.variables);
  }
}
