import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

export type ComposerMode   = "reply" | "reply_all" | "forward" | "new";
export type ComposerStatus = "idle" | "sending" | "sent" | "error";
export type ComposerShell  = "panel" | "sheet" | "window" | "dialog";

export interface ComposerRecipient {
  email: string;
  name?: string;
}

export interface ComposerInstance {
  id:    string;
  shell: ComposerShell;
  mode:  ComposerMode;

  // context
  threadId?:         string;
  replyToMessageId?: string;
  quotedHtml?:       string;

  // draft sync — set after createDraft succeeds
  draftId?:         string;
  providerDraftId?: string;

  // sender — populated from FullEmail.emailAddress + provider
  from:     string;
  provider: "GOOGLE" | "OUTLOOK";

  // recipients
  to:      ComposerRecipient[];
  cc:      ComposerRecipient[];
  bcc:     ComposerRecipient[];
  showCc:  boolean;
  showBcc: boolean;

  subject: string;
  html:    string;

  isDirty:       boolean;
  isMinimized:   boolean;
  status:        ComposerStatus;
  errorMessage?: string;
}

export interface OpenComposerParams {
  shell:    ComposerShell;
  mode:     ComposerMode;
  from:     string;
  provider: "GOOGLE" | "OUTLOOK";
  threadId?:         string;
  replyToMessageId?: string;
  quotedHtml?:       string;
  // pre-populate from a restored draft
  draftId?:         string;
  providerDraftId?: string;
  initialHtml?:     string;
  to?:      ComposerRecipient[];
  cc?:      ComposerRecipient[];
  bcc?:     ComposerRecipient[];
  subject?: string;
}

interface ComposerStore {
  instances: ComposerInstance[];
  open:      (params: OpenComposerParams) => string;
  close:     (id: string) => void;
  update:    (id: string, patch: Partial<ComposerInstance>) => void;
  minimize:  (id: string) => void;
  restore:   (id: string) => void;
  setStatus: (id: string, status: ComposerStatus, error?: string) => void;
  setHtml:   (id: string, html: string) => void;
  setDraftId:(id: string, draftId: string, providerDraftId?: string) => void;
  addTo:     (id: string, r: ComposerRecipient) => void;
  removeTo:  (id: string, email: string) => void;
  addCc:     (id: string, r: ComposerRecipient) => void;
  removeCc:  (id: string, email: string) => void;
  addBcc:    (id: string, r: ComposerRecipient) => void;
  removeBcc: (id: string, email: string) => void;
}

function makeInstance(params: OpenComposerParams): ComposerInstance {
  return {
    id:               crypto.randomUUID(),
    shell:            params.shell,
    mode:             params.mode,
    threadId:         params.threadId,
    replyToMessageId: params.replyToMessageId,
    quotedHtml:       params.quotedHtml,
    draftId:          params.draftId,
    providerDraftId:  params.providerDraftId,
    from:             params.from,
    provider:         params.provider,
    to:               params.to   ?? [],
    cc:               params.cc   ?? [],
    bcc:              params.bcc  ?? [],
    showCc:           (params.cc  ?? []).length > 0,
    showBcc:          (params.bcc ?? []).length > 0,
    subject:          params.subject ?? "",
    html:             params.initialHtml ?? "",
    isDirty:          false,
    isMinimized:      false,
    status:           "idle",
  };
}

export const useComposerStore = create<ComposerStore>((set, get) => ({
  instances: [],

  open: (params) => {
    if (params.shell === "panel") {
      // panel: one globally — replace
      const existing = get().instances.find((i) => i.shell === "panel");
      if (existing) {
        const next = { ...makeInstance(params), id: existing.id };
        set((s) => ({ instances: s.instances.map((i) => i.id === existing.id ? next : i) }));
        return existing.id;
      }
    } else if (params.shell === "sheet") {
      // sheet: one per threadId — replace that thread's draft, keep others
      const existing = get().instances.find(
        (i) => i.shell === "sheet" && i.threadId === params.threadId,
      );
      if (existing) {
        const next = { ...makeInstance(params), id: existing.id };
        set((s) => ({ instances: s.instances.map((i) => i.id === existing.id ? next : i) }));
        return existing.id;
      }
    }
    // window: unlimited; panel/sheet (new): append
    const inst = makeInstance(params);
    set((s) => ({ instances: [...s.instances, inst] }));
    return inst.id;
  },

  close: (id) =>
    set((s) => ({ instances: s.instances.filter((i) => i.id !== id) })),

  update: (id, patch) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, ...patch, isDirty: true } : i,
      ),
    })),

  minimize: (id) =>
    set((s) => ({ instances: s.instances.map((i) => i.id === id ? { ...i, isMinimized: true  } : i) })),
  restore: (id) =>
    set((s) => ({ instances: s.instances.map((i) => i.id === id ? { ...i, isMinimized: false } : i) })),

  setStatus: (id, status, errorMessage) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id
          ? { ...i, status, errorMessage, isDirty: status === "sent" ? false : i.isDirty }
          : i,
      ),
    })),

  setHtml: (id, html) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, html, isDirty: true } : i,
      ),
    })),

  setDraftId: (id, draftId, providerDraftId) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, draftId, providerDraftId } : i,
      ),
    })),

  addTo: (id, r) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id && !i.to.find((x) => x.email === r.email)
          ? { ...i, to: [...i.to, r], isDirty: true }
          : i,
      ),
    })),
  removeTo: (id, email) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, to: i.to.filter((x) => x.email !== email), isDirty: true } : i,
      ),
    })),

  addCc: (id, r) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id && !i.cc.find((x) => x.email === r.email)
          ? { ...i, cc: [...i.cc, r], isDirty: true }
          : i,
      ),
    })),
  removeCc: (id, email) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, cc: i.cc.filter((x) => x.email !== email), isDirty: true } : i,
      ),
    })),

  addBcc: (id, r) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id && !i.bcc.find((x) => x.email === r.email)
          ? { ...i, bcc: [...i.bcc, r], isDirty: true }
          : i,
      ),
    })),
  removeBcc: (id, email) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, bcc: i.bcc.filter((x) => x.email !== email), isDirty: true } : i,
      ),
    })),
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────
export const usePanelInstance = () =>
  useComposerStore((s) => s.instances.find((i) => i.shell === "panel"));

/** Thread-scoped: each thread keeps its own sheet draft */
export const useSheetInstance = (threadId?: string) =>
  useComposerStore((s) =>
    s.instances.find((i) => i.shell === "sheet" && i.threadId === threadId),
  );

export const useWindowInstances = () =>
  useComposerStore(useShallow((s) => s.instances.filter((i) => i.shell === "window")));
