import { OutlookApiService } from "./outlook-api.service";

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  lastModifiedDateTime: string;
  "@odata.type": string;
  contentBytes?: string; // Base64 encoded (if fetched)
}

export interface OutlookEmailAttachment {
  name: string;
  contentType: string;
  contentBase64: string;
  size?: number;
}

export type SendEmailInput = {
  mode: "new" | "reply" | "reply_all" | "forward";

  from?: string; // Not used in Outlook (uses authenticated user)

  to?: string[];
  cc?: string[];
  bcc?: string[];

  subject?: string;
  html: string;
  text?: string;

  // threading
  replyToMessageId?: string; // Outlook message id

  attachments?: OutlookEmailAttachment[];
};

export interface OutlookMessage {
  id: string;
  conversationId: string;

  receivedDateTime: string;
  sentDateTime: string;

  subject: string;
  bodyPreview: string;

  from?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };

  toRecipients: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];

  ccRecipients?: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];

  body: {
    contentType: "text" | "html";
    content: string;
  };

  hasAttachments: boolean;
  attachments?: OutlookAttachment[]; // Optional: populated when includeAttachments is true
  internetMessageHeaders?: {
    name: string;
    value: string;
  }[];
}


