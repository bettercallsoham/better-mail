import { apiClient } from "@/lib/api/client";
import {
  ListFeedbackParams,
  ListFeedbackResponse,
  GetFeedbackPostResponse,
  CreateFeedbackPostDto,
  CreateFeedbackPostResponse,
  ToggleUpvoteResponse,
  AddCommentResponse,
  UploadSignatureResponse,
} from "./feedback.type";

function buildUrl(
  base: string,
  params: Record<string, string | number | undefined>,
): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export const feedbackApi = {

  listPosts: (params?: ListFeedbackParams) =>
    apiClient<ListFeedbackResponse>(
      buildUrl("/feedback", {
        type: params?.type,
        sort: params?.sort,
        page: params?.page,
        limit: params?.limit,
      }),
    ),

  getPost: (postId: string) =>
    apiClient<GetFeedbackPostResponse>(`/feedback/${postId}`),

  createPost: (dto: CreateFeedbackPostDto) =>
    apiClient<CreateFeedbackPostResponse>("/feedback", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  deletePost: (postId: string) =>
    apiClient<{ success: boolean; message: string }>(`/feedback/${postId}`, {
      method: "DELETE",
    }),


  toggleUpvote: (postId: string) =>
    apiClient<ToggleUpvoteResponse>(`/feedback/${postId}/upvote`, {
      method: "POST",
    }),


  addComment: (postId: string, body: string) =>
    apiClient<AddCommentResponse>(`/feedback/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  deleteComment: (postId: string, commentId: string) =>
    apiClient<{ success: boolean; message: string }>(
      `/feedback/${postId}/comments/${commentId}`,
      { method: "DELETE" },
    ),


  getUploadSignature: () =>
    apiClient<UploadSignatureResponse>("/feedback/upload-signature"),
};