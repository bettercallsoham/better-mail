export type IntegrationStatus = "pending" | "active" | "revoked";

export interface TelegramIntegrationData {
  status: IntegrationStatus;
  connectedAt: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
}

export interface GetIntegrationsResponse {
  success: true;
  data: {
    telegram: TelegramIntegrationData | null;
    slack: null;
    notion: null;
    googleCalendar: null;
  };
}

export interface GetTelegramLinkResponse {
  link: string;
}

export interface DisconnectResponse {
  success: boolean;
}
