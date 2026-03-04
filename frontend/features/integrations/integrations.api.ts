import { apiClient } from "@/lib/api/client";
import type {
  GetIntegrationsResponse,
  GetTelegramLinkResponse,
  DisconnectResponse,
} from "./integrations.types";

export const integrationsService = {
  getAll: () => apiClient<GetIntegrationsResponse>("/integrations"),

  getTelegramLink: () =>
    apiClient<GetTelegramLinkResponse>("/integrations/telegram/link", {
      method: "POST",
    }),

  disconnectTelegram: () =>
    apiClient<DisconnectResponse>("/integrations/telegram/disconnect", {
      method: "POST",
    }),
};
