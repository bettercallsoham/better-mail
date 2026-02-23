import { apiClient } from "../../lib/api/client";
import {
  ConnectResponse,
  GetConnectedAccountsResponse,
  GetFoldersResponse,
  GetThreadDetailResponse,
  GetThreadEmailsResponse,
  ThreadQueryParams,
} from "./mailbox.type";

export const mailboxService = {
  getConnectedAccounts: () =>
    apiClient<GetConnectedAccountsResponse>("/mail/connected-accounts"),

  connectGmail: () => apiClient<ConnectResponse>("/connect/gmail"),

  connectOutlook: () => apiClient<ConnectResponse>("/connect/outlook"),

  getThreadEmails: (params: ThreadQueryParams) => {
    const searchParams = new URLSearchParams();

    if (params.email) searchParams.append("email", params.email);
    if (params.size) searchParams.append("size", params.size.toString());
    if (params.cursor) searchParams.append("cursor", params.cursor);

    return apiClient<GetThreadEmailsResponse>(
      `/mail/thread-emails?${searchParams.toString()}`,
    );
  },

  getThreadDetail: (threadId: string) =>
    apiClient<GetThreadDetailResponse>(`/mail/thread/${threadId}`),

  getFolders: (email?: string) => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    return apiClient<GetFoldersResponse>(`/mail/folders?${params.toString()}`);
  },
};
