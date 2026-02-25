import { apiClient } from "../../lib/api/client";
import {
  ConnectResponse,
  CreateSavedSearchParams,
  CreateSavedSearchResponse,
  GetConnectedAccountsResponse,
  GetFoldersResponse,
  GetRecentSearchesResponse,
  GetSavedSearchesResponse,
  GetSenderThreadsResponse,
  GetThreadDetailResponse,
  GetThreadEmailsResponse,
  GetThreadNoteResponse,
  SearchEmailsResponse,
  SearchQueryParams,
  ThreadQueryParams,
  UpsertThreadNoteParams,
  UpsertThreadNoteResponse,
} from "./mailbox.type";

export const mailboxService = {
  // ── Accounts ──────────────────────────────────────────────────────────────
  getConnectedAccounts: () =>
    apiClient<GetConnectedAccountsResponse>("/mail/connected-accounts"),

  connectGmail: () => apiClient<ConnectResponse>("/connect/gmail"),
  connectOutlook: () => apiClient<ConnectResponse>("/connect/outlook"),

  getThreadEmails: (params: ThreadQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params.email) searchParams.append("email", params.email);
    if (params.size) searchParams.append("size", params.size.toString());
    if (params.page !== undefined && params.page !== null)
      searchParams.append("page", params.page.toString());
    if (params.folder) searchParams.append("folder", params.folder);
    return apiClient<GetThreadEmailsResponse>(
      `/mail/thread-emails?${searchParams.toString()}`,
    );
  },

  getThreadDetail: (threadId: string) =>
    apiClient<GetThreadDetailResponse>(`/mail/thread/${threadId}`),

  // ── Sender threads ─────────────────────────────────────────────────────────
  // GET /mail/from/:senderEmail
  getThreadsBySender: (senderEmail: string) =>
    apiClient<GetSenderThreadsResponse>(
      `/mail/from/${encodeURIComponent(senderEmail)}`,
    ),

  getFolders: (email?: string) => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    return apiClient<GetFoldersResponse>(`/mail/folders?${params.toString()}`);
  },

  searchEmails: (params: SearchQueryParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append("query", params.query);
    if (params.from) searchParams.append("from", params.from);
    if (params.size) searchParams.append("size", params.size.toString());
    if (params.page !== undefined && params.page !== null)
      searchParams.append("page", params.page.toString());
    if (params.isRead !== undefined)
      searchParams.append("isRead", String(params.isRead));
    if (params.isStarred !== undefined)
      searchParams.append("isStarred", String(params.isStarred));
    if (params.isArchived !== undefined)
      searchParams.append("isArchived", String(params.isArchived));
    if (params.hasAttachments !== undefined)
      searchParams.append("hasAttachments", String(params.hasAttachments));
    if (params.filterFrom) searchParams.append("filterFrom", params.filterFrom);
    if (params.filterTo) searchParams.append("filterTo", params.filterTo);
    if (params.labels) searchParams.append("labels", params.labels);
    if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.append("dateTo", params.dateTo);
    return apiClient<SearchEmailsResponse>(
      `/mail/search?${searchParams.toString()}`,
    );
  },

  getRecentSearches: () =>
    apiClient<GetRecentSearchesResponse>("/mail/recent-searches"),

  getSavedSearches: () =>
    apiClient<GetSavedSearchesResponse>("/mail/saved-searches"),

  createSavedSearch: (params: CreateSavedSearchParams) =>
    apiClient<CreateSavedSearchResponse>("/mail/saved-searches", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getThreadNote: (threadId: string) =>
    apiClient<GetThreadNoteResponse>(`/mail/threads/${threadId}/note`),

  upsertThreadNote: ({ threadId, content }: UpsertThreadNoteParams) =>
    apiClient<UpsertThreadNoteResponse>(`/mail/threads/${threadId}/note`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
};
