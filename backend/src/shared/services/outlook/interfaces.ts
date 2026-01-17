export interface OutlookFolder {
  id: string;
  displayName: string;
  totalItemCount: number;
}

export interface OutlookEmailAddress {
  name: string;
  address: string;
}

export interface OutlookRecipient {
  emailAddress: OutlookEmailAddress;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  sentDateTime: string;
  from: OutlookRecipient | null;
  toRecipients: OutlookRecipient[];
  ccRecipients: OutlookRecipient[];
  isRead: boolean;
  hasAttachments: boolean;
  conversationId: string;
  internetMessageId: string;
  webLink: string;
}

export interface OutlookFolderWithMessages {
  folder: OutlookFolder;
  messages: OutlookMessage[];
}
