import { apiClient } from "../../lib/api/client";
import {
  ConnectResponse,
  GetConnectedAccountsResponse,
  GetFoldersResponse,
  GetSenderThreadsResponse,
  GetThreadDetailResponse,
  GetThreadEmailsResponse,
  LabelActionParams,
  ThreadActionParams,
  ThreadQueryParams,
} from "./mailbox.type";

export const mailboxService = {
  // ── Accounts ──────────────────────────────────────────────────────────────
  getConnectedAccounts: () =>
    apiClient<GetConnectedAccountsResponse>("/mail/connected-accounts"),

  connectGmail:   () => apiClient<ConnectResponse>("/connect/gmail"),
  connectOutlook: () => apiClient<ConnectResponse>("/connect/outlook"),

  // ── Threads ───────────────────────────────────────────────────────────────
  getThreadEmails: (params: ThreadQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params.email)  searchParams.append("email",  params.email);
    if (params.size)   searchParams.append("size",   params.size.toString());
    if (params.cursor) searchParams.append("cursor", params.cursor);
    return apiClient<GetThreadEmailsResponse>(
      `/mail/thread-emails?${searchParams.toString()}`,
    );
  },

  getThreadDetail: (threadId: string) =>
    apiClient<GetThreadDetailResponse>(`/mail/thread/${threadId}`),

  // ── Sender threads ─────────────────────────────────────────────────────────
  // GET /mail/from/:senderEmail
  getThreadsBySender: (senderEmail: string) =>
    apiClient<GetSenderThreadsResponse>(`/mail/from/${encodeURIComponent(senderEmail)}`),

  // ── Folders / Labels ──────────────────────────────────────────────────────
  getFolders: (email?: string) => {
    const params = new URLSearchParams();
    if (email) params.append("email", email);
    return apiClient<GetFoldersResponse>(`/mail/folders?${params.toString()}`);
  },

  // ── Thread actions ─────────────────────────────────────────────────────────
  starThread: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}/star`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  unstarThread: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}/unstar`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  archiveThread: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}/archive`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  markRead: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}/read`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  markUnread: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}/unread`, {
      method: "POST",
      body: JSON.stringify({ emailAddress }),
    }),

  deleteThread: ({ threadId, emailAddress }: ThreadActionParams) =>
    apiClient(`/mail/thread/${threadId}`, {
      method: "DELETE",
      body: JSON.stringify({ emailAddress }),
    }),

  addLabel: ({ threadId, emailAddress, label }: LabelActionParams) =>
    apiClient(`/mail/thread/${threadId}/label`, {
      method: "POST",
      body: JSON.stringify({ emailAddress, label }),
    }),

  removeLabel: ({ threadId, emailAddress, label }: LabelActionParams) =>
    apiClient(`/mail/thread/${threadId}/label`, {
      method: "DELETE",
      body: JSON.stringify({ emailAddress, label }),
    }),
};