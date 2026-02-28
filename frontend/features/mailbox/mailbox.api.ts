import { apiClient } from "../../lib/api/client";
import {
  ConnectResponse,
  CreateDraftParams,
  CreateDraftResponse,
  CreateSavedSearchParams,
  CreateSavedSearchResponse,
  EmailActionParams,
  EmailActionResponse,
  ExecuteSavedSearchResponse,
  GetConnectedAccountsResponse,
  GetDraftResponse,
  GetEmailsFromSenderResponse,
  GetEmailSuggestionsResponse,
  GetFoldersResponse,
  GetInboxZeroResponse,
  GetRecentSearchesResponse,
  GetSavedSearchesResponse,
  GetSenderThreadsResponse,
  GetThreadDetailResponse,
  GetThreadEmailsResponse,
  GetThreadNoteResponse,
  InboxZeroParams,
  ReplyEmailParams,
  ReplyEmailResponse,
  SearchEmailsResponse,
  SearchQueryParams,
  SendDraftResponse,
  SendEmailParams,
  SendEmailResponse,
  ThreadQueryParams,
  UpdateDraftParams,
  UpdateDraftResponse,
  UpdateInboxStateParams,
  UpdateSavedSearchParams,
  UpdateSavedSearchResponse,
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

  getThreadNote: (threadId: string, emailAddress: string) =>
    apiClient<GetThreadNoteResponse>(
      `/mail/threads/${threadId}/${emailAddress}/note`,
    ),

  upsertThreadNote: ({
    threadId,
    content,
    emailAddress,
  }: UpsertThreadNoteParams) =>
    apiClient<UpsertThreadNoteResponse>(`/mail/threads/${threadId}/note`, {
      method: "PUT",
      body: JSON.stringify({ content, emailAddress }), // ← added emailAddress
    }),

  getInboxZero: (params?: InboxZeroParams) => {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append("from", params.from);
    if (params?.size) searchParams.append("size", params.size.toString());
    if (params?.cursor) searchParams.append("cursor", params.cursor);
    return apiClient<GetInboxZeroResponse>(
      `/mail/inbox-zero?${searchParams.toString()}`,
    );
  },

  updateInboxState: (params: UpdateInboxStateParams) =>
    apiClient(`/mail/inbox-state`, {
      method: "POST",
      body: JSON.stringify(params),
    }),

  createDraft: (params: CreateDraftParams) =>
    apiClient<CreateDraftResponse>("/mail/drafts", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  sendDraft: (draftId: string) =>
    apiClient<SendDraftResponse>(`/mail/drafts/${draftId}/send`, {
      method: "POST",
    }),

  deleteDraft: (draftId: string) =>
    apiClient(`/mail/drafts/${draftId}`, { method: "DELETE" }),

  sendEmail: (params: SendEmailParams) =>
    apiClient<SendEmailResponse>("/mail/send-new-email", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  replyEmail: (params: ReplyEmailParams) =>
    apiClient<ReplyEmailResponse>("/mail/reply-email", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  emailAction: (params: EmailActionParams) =>
    apiClient<EmailActionResponse>("/mail/email-action", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  executeSavedSearch: (id: string) =>
    apiClient<ExecuteSavedSearchResponse>(`/mail/saved-searches/${id}/execute`),

  updateSavedSearch: ({ id, ...params }: UpdateSavedSearchParams) =>
    apiClient<UpdateSavedSearchResponse>(`/mail/saved-searches/${id}`, {
      method: "PUT",
      body: JSON.stringify(params),
    }),

  deleteSavedSearch: (id: string) =>
    apiClient(`/mail/saved-searches/${id}`, { method: "DELETE" }),

  // Updated to match your JSON structure and support pagination
  getEmailsFromSender: (
    senderEmail: string,
    params?: { size?: number; cursor?: string },
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.size) searchParams.append("size", params.size.toString());
    if (params?.cursor) searchParams.append("cursor", params.cursor);

    return apiClient<GetEmailsFromSenderResponse>(
      `/mail/from/${encodeURIComponent(senderEmail)}?${searchParams.toString()}`,
    );
  },

  getEmailSuggestions: (query?: string, limit?: number) => {
    const searchParams = new URLSearchParams();

    if (query) searchParams.append("query", query);
    if (limit) searchParams.append("limit", limit.toString());

    const qs = searchParams.toString();
    const url = qs ? `/mail/suggestions?${qs}` : "/mail/suggestions";

    return apiClient<GetEmailSuggestionsResponse>(url);
  },
  // ── Drafts ──────────────────────────────────────────────────────────

  getDraftById: (id: string) => {
    return apiClient<GetDraftResponse>(
      `/mail/drafts/${encodeURIComponent(id)}`,
    );
  },

  updateDraft: (id: string, payload: Omit<UpdateDraftParams, "id">) => {
    return apiClient<UpdateDraftResponse>(
      `/mail/drafts/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
};
