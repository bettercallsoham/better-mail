export type FeedbackPostType =
  | "feature_request"
  | "bug_report"
  | "improvement"
  | "question";

export type FeedbackPostStatus = "open" | "under_review" | "closed";

export type FeedbackSortOrder = "top" | "new";

export interface FeedbackAuthor {
  id: string;
  fullName: string;
  avatar: string | null;
}

export interface FeedbackComment {
  id: string;
  postId: string;
  body: string;
  author: FeedbackAuthor;
  created_at: string;
  updated_at: string;
}

export interface FeedbackPost {
  id: string;
  type: FeedbackPostType;
  status: FeedbackPostStatus;
  title: string;
  description: string;
  attachments: string[];
  upvoteCount: number;
  commentCount: number;
  author: FeedbackAuthor;
  hasUpvoted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackPostDetail extends FeedbackPost {
  comments: FeedbackComment[];
}

export interface ListFeedbackParams {
  type?: FeedbackPostType;
  sort?: FeedbackSortOrder;
  page?: number;
  limit?: number;
}

export interface CreateFeedbackPostDto {
  title: string;
  description: string;
  type: FeedbackPostType;
  attachments?: string[];
}

export interface ListFeedbackResponse {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  data: FeedbackPost[];
}

export interface GetFeedbackPostResponse {
  success: boolean;
  data: FeedbackPostDetail;
}

export interface CreateFeedbackPostResponse {
  success: boolean;
  data: FeedbackPost;
}

export interface ToggleUpvoteResponse {
  success: boolean;
  data: {
    upvoted: boolean;
    upvoteCount: number;
  };
}

export interface AddCommentResponse {
  success: boolean;
  data: FeedbackComment;
}

export interface UploadSignatureResponse {
  success: boolean;
  data: {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };
}
