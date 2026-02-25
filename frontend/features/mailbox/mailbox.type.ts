export interface ConnectedAccount {
  id: string;
  email: string;
  created_at: string;
  provider?: string;
}

export interface GetConnectedAccountsResponse {
  message: string;
  success: boolean;
  data: ConnectedAccount[];
}



export interface ThreadEmail {
  threadId:    string;
  lastEmailId: string;
  subject:     string;
  snippet:     string;
  receivedAt:  string;
  from:        { email: string; name?: string };
  to:          { email: string; name?: string }[];
  isUnread:    boolean;
  isStarred:   boolean;
  labels:      string[];
}

export interface GetThreadEmailsResponse {
  success:  boolean;
  message?: string;
  data: {
    threads:  ThreadEmail[];
    nextPage: number | null;
  };
}

export interface GetSenderThreadsResponse {
  success: boolean;
  data: {
    threads: ThreadEmail[];
  };
}

export interface ConnectResponse {
  url: string;
}

export interface ThreadQueryParams {
  email?:  string;
  size?:   number;
  page?:   number;
  folder?: string; 
}

export interface EmailAddress {
  email: string;
  name:  string;
}

export interface FullEmail {
  id:             string;
  emailAddress:   string;
  provider:       "gmail" | "outlook";
  subject:        string;
  bodyHtml:       string;
  bodyText?:      string;
  snippet:        string;
  from:           EmailAddress;
  to:             EmailAddress[];
  receivedAt:     string;
  isRead:         boolean;
  hasAttachments: boolean;
  threadId:       string;
  isStarred:      boolean;
  isDraft:        boolean;
  labels?:        string[];
}

export interface GetThreadDetailResponse {
  success: boolean;
  data: {
    total:  { value: number; relation: string };
    emails: FullEmail[];
  };
}

export interface SystemFolders {
  unread:    number;
  starred:   number;
  archived:  number;
  inbox:     number;
  sent:      number;
  important: number;
  drafts:    number;
}

export interface MailLabel {
  label: string;
  count: number;
}

export interface GetFoldersResponse {
  success: boolean;
  data: {
    system: SystemFolders;
    labels: MailLabel[];
  };
}


export interface SearchEmail {
  id:             string;
  threadId:       string;
  score:          number;
  subject:        string;
  snippet:        string;
  receivedAt:     string;
  from:           { email: string; name?: string };
  to:             { email: string; name?: string }[];
  isRead:         boolean;
  isStarred:      boolean;
  isArchived:     boolean;
  hasAttachments: boolean;
  labels:         string[];
  emailAddress:   string;
  provider:       "gmail" | "outlook";
}

export interface SearchQueryParams {
  query:          string;
  from?:          string;
  size?:          number;
  page?:          number;
  isRead?:        boolean;
  isStarred?:     boolean;
  isArchived?:    boolean;
  hasAttachments?: boolean;
  filterFrom?:    string;
  filterTo?:      string;
  labels?:        string;
  dateFrom?:      string;
  dateTo?:        string;
}

export interface SearchEmailsResponse {
  success:  boolean;
  query:    string;
  total:    number;
  page:     number;
  nextPage: number | null;
  emails:   SearchEmail[];
}

// ── Recent Searches ────────────────────────────────────────────────────────────
export interface RecentSearch {
  id:             string;
  userId:         string;
  searchText:     string;
  filters:        Record<string, unknown>;
  resultsCount:   number;
  executionTimeMs: number;
  emailAddresses: string[];
  searchedAt:     string;
  searchCount:    number;
}

export interface GetRecentSearchesResponse {
  success: boolean;
  data:    RecentSearch[];
}

export interface SavedSearchQuery {
  searchText: string;
  filters:    {
    labels?: string[];
    [key: string]: unknown;
  };
}

export interface SavedSearch {
  id:          string;
  userId:      string;
  name:        string;
  description?: string;
  query:       SavedSearchQuery;
  usageCount:  number;
  isPinned:    boolean;
  color?:      string;
  createdAt:   string;
  updatedAt:   string;
}

export interface GetSavedSearchesResponse {
  success: boolean;
  data:    SavedSearch[];
}

export interface CreateSavedSearchParams {
  name:         string;
  description?: string;
  query:        SavedSearchQuery;
  isPinned?:    boolean;
  color?:       string;
}

export interface CreateSavedSearchResponse {
  success: boolean;
  data:    SavedSearch;
}

export interface ThreadNote {
  threadId:        string;
  emailAddress:    string;
  notes:           string;
  requiresAction:  boolean;
  lastActivityAt:  string;
}

export interface GetThreadNoteResponse {
  success: boolean;
  data:    ThreadNote;
}

export interface UpsertThreadNoteResponse {
  success: boolean;
  message: string;
  data:    ThreadNote;
}

export interface UpsertThreadNoteParams {
  threadId: string;
  content:  string;
}