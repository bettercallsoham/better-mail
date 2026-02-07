export interface GmailHeader {
  name: string;
  value: string;
}

export interface Attachment {
  filename: string;
  mimeType: string;
  content: string; // base64 encoded
  size?: number;
}

export interface GmailBody {
  size: number;
  data?: string;
  attachmentId?: string;
}

export interface GmailPayload {
  partId: string;
  mimeType: string;
  filename: string;

  headers: GmailHeader[];

  body: GmailBody;

  parts?: GmailPayload[];
}

export interface GmailMessage {
  id: string;
  threadId: string;

  labelIds: string[];

  snippet: string;

  sizeEstimate: number;

  historyId: string;

  internalDate: string;

  payload: GmailPayload;
}

export type SendEmailInput = {
  mode: "new" | "reply" | "reply_all" | "forward";

  from: string;

  to?: string[];
  cc?: string[];
  bcc?: string[];

  subject?: string;
  html: string;
  text?: string;

  // threading
  replyToMessageId?: string; // Gmail message id
  replyToThreadId?: string; // Gmail thread id
  references?: string[]; // Message-IDs

  attachments?: Attachment[];
};
