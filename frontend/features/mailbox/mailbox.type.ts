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

export interface ThreadCursor {
  receivedAt: string;
  id: string;
}

export interface ThreadEmail {
  threadId: string;
  latestEmailId: string;
  subject: string;
  snippet: string;
  receivedAt: string;

  from: {
    email: string;
    name?: string;
  };

  to: {
    email: string;
    name?: string;
  }[];

  isUnread: boolean;
  isStarred: boolean;
}

export interface GetThreadEmailsResponse {
  success: boolean;
  message?: string;
  data: {
    threads: ThreadEmail[];
    nextCursor: ThreadCursor | null;
  };
}

export interface ConnectResponse {
  url: string;
}

export interface ThreadQueryParams {
  email?: string;
  size?: number;
  cursor?: string;
}

export interface EmailAddress {
  email: string;
  name: string;
}

export interface FullEmail {
  id: string;
  emailAddress: string;
  provider: "gmail" | "outlook";
  subject: string;
  bodyHtml: string;
  snippet: string;
  from: EmailAddress;
  to: EmailAddress[];
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  threadId: string;
  // Metadata for UI toggles
  isStarred: boolean;
  isDraft: boolean;
}

export interface GetThreadDetailResponse {
  success: boolean;
  data: {
    total: { value: number; relation: string };
    emails: FullEmail[];
  };
}

export interface SystemFolders {
  unread: number;
  starred: number;
  archived: number;
  inbox: number;
  sent: number;
  important: number;
  drafts: number;
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
