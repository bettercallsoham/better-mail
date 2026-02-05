export interface GmailHeader {
  name: string;
  value: string;
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
