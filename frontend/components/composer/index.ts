// ─── Store ─────────────────────────────────────────────────────────────────────
export {
  useComposerStore,
  useWindowInstances,
  usePanelInstance,
  useSheetInstance,
} from "@/lib/store/composer.store";
export type {
  ComposerInstance,
  ComposerMode,
  ComposerStatus,
  ComposerShell,
  ComposerRecipient,
  OpenComposerParams,
} from "@/lib/store/composer.store";

// ─── Hooks ─────────────────────────────────────────────────────────────────────
export { useComposer } from "./hooks/useComposer";
export { useGhostText } from "./hooks/useGhostText";
export { useSmartReplies } from "./hooks/useSmartReplies";

// ─── Core components ───────────────────────────────────────────────────────────
export { ComposerEditor } from "./ComposerEditor";
export { ComposerHeader } from "./ComposerHeader";
export { ComposerFooter } from "./ComposerFooter";
export { QuotedThread } from "./QuotedThread";
export { AttachmentChip } from "./AttachmentChip";
// TODO: SmartReplies not yet implemented
export { RecipientInput } from "./RecipientInput";

// ─── Shells ────────────────────────────────────────────────────────────────────
export { PanelShell } from "./shells/PanelShell";
export { SheetShell } from "./shells/SheetShell";
export { WindowShell } from "./shells/WindowShell";

// ─── Portal (mount once in root layout) ───────────────────────────────────────
export { ComposerPortal } from "./ComposerPortal";
