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
  emailAddress: string;
  provider: EmailProvider;
  providerMessageId: string;
  providerThreadId: string;

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

  // ---- Drafts ----
  isDraft: boolean;
  draftData?: {
    providerDraftId?: string; // Gmail/Outlook draft ID
    lastEditedAt: string;
  };

  // ---- Inbox Zero ----
  inboxState?: "INBOX" | "ARCHIVED" | "SNOOZED" | "DONE" | "DRAFT";
  snoozeUntil?: string;

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
  emailAddress: string;

  notes?: string;
  requiresAction: boolean;

  reminder?: ThreadReminder;

  lastActivityAt: string;
}

// --------------------
// Saved Search Document
// --------------------

export interface SavedSearchFilters {
  isRead?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  hasAttachments?: boolean;
  from?: string[];
  to?: string[];
  labels?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SavedSearchDocument {
  id: string;
  userId: string;
  name: string;
  description?: string;
  query: {
    searchText: string;
    filters?: SavedSearchFilters;
    emailAddresses?: string[];
  };
  usageCount: number;
  lastUsedAt?: string;
  isPinned: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// --------------------
// Search History Document
// --------------------

export interface SearchHistoryDocument {
  id: string;
  userId: string;
  searchText: string;
  filters?: SavedSearchFilters;
  resultsCount: number;
  executionTimeMs: number;
  emailAddresses: string[];
  searchedAt: string;
}
// --------------------
// Analytics Interfaces
// --------------------

export interface AnalyticsOverview {
  period: "daily" | "weekly" | "monthly";
  dateRange: { from: string; to: string };
  metrics: {
    received: number;
    sent: number;
    read: number;
    readRate: number;
    archived: number;
    deleted: number;
    starred: number;
  };
}

export interface TimePatterns {
  hourlyDistribution: Record<string, number>;
  dailyDistribution: Record<string, number>;
  peakHours: Array<{ hour: number; count: number; label: string }>;
  busiestDay: string;
  quietestDay: string;
  avgEmailsPerHour: Record<string, number>;
}
