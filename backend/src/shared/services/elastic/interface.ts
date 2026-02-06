export type EmailProvider = "gmail" | "outlook";

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline?: boolean;
}

export interface UnifiedEmailDocument {
  id: string;
  provider: EmailProvider;
  providerMessageId: string;
  providerThreadId: string;
  mailboxId: string;

  // ---- Threading ----
  threadId: string;
  isThreadRoot: boolean;

  // ---- Timestamps ----
  receivedAt: string;
  sentAt: string;
  indexedAt: string;

  // ---- Participants ----
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];

  // ---- Content ----
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  snippet?: string;

  // ---- Attachments ----
  hasAttachments: boolean;
  attachments: EmailAttachment[];

  // ---- State / Operations ----
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;

  labels: string[];
  providerLabels: string[];

  // ---- Search / AI ----
  searchText: string;
  embedding?: number[];

  // ---- Provider Raw (debug only) ----
  raw?: {
    gmail?: unknown;
    outlook?: unknown;
  };
}

// --------------------
// Thread Document
// --------------------

export interface ThreadReminder {
  remindAt: string;
  status: "pending" | "done";
}

export interface ThreadDocument {
  threadId: string;
  mailboxId: string;

  notes?: string;
  requiresAction: boolean;

  reminder?: ThreadReminder;

  lastActivityAt: string;
}
