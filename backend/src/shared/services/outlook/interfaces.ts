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
  internetMessageHeaders?: {
    name: string;
    value: string;
  }[];
}
