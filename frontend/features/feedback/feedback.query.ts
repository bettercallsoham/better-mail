import {
  useSuspenseQuery,
  useQuery,
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
  InfiniteData,
} from "@tanstack/react-query";
import { feedbackApi } from "./feedback.api";
import {
  ListFeedbackParams,
  CreateFeedbackPostDto,
  ListFeedbackResponse,
  FeedbackPost,
  GetFeedbackPostResponse,
  UploadSignatureResponse,
} from "./feedback.type";


export const feedbackKeys = {
  all: ["feedback"] as const,

  lists: () => [...feedbackKeys.all, "list"] as const,
  list: (params?: ListFeedbackParams) =>
    [...feedbackKeys.lists(), params] as const,

  details: () => [...feedbackKeys.all, "detail"] as const,
  detail: (postId: string) => [...feedbackKeys.details(), postId] as const,

  signature: () => [...feedbackKeys.all, "upload-signature"] as const,
};


export function useFeedbackPosts(params?: ListFeedbackParams) {
  return useSuspenseInfiniteQuery({
    queryKey: feedbackKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      feedbackApi.listPosts({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: ListFeedbackResponse) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFeedbackPost(postId: string) {
  return useSuspenseQuery({
    queryKey: feedbackKeys.detail(postId),
    queryFn: () => feedbackApi.getPost(postId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}


export function useCreatePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFeedbackPostDto) => feedbackApi.createPost(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedbackApi.deletePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
}

export function useToggleUpvote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedbackApi.toggleUpvote(postId),

    onMutate: async (postId: string) => {
      await qc.cancelQueries({ queryKey: feedbackKeys.lists() });
      await qc.cancelQueries({ queryKey: feedbackKeys.detail(postId) });

      // Snapshot for rollback
      const previousLists = qc.getQueriesData<
        InfiniteData<ListFeedbackResponse>
      >({
        queryKey: feedbackKeys.lists(),
      });

      const previousDetail = qc.getQueryData<GetFeedbackPostResponse>(
        feedbackKeys.detail(postId),
      );

      qc.setQueriesData<InfiniteData<ListFeedbackResponse>>(
        { queryKey: feedbackKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((post: FeedbackPost) =>
                post.id === postId
                  ? {
                      ...post,
                      hasUpvoted: !post.hasUpvoted,
                      upvoteCount: post.hasUpvoted
                        ? post.upvoteCount - 1
                        : post.upvoteCount + 1,
                    }
                  : post,
              ),
            })),
          };
        },
      );

      // Optimistically update detail cache
      qc.setQueryData<GetFeedbackPostResponse>(
        feedbackKeys.detail(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              hasUpvoted: !old.data.hasUpvoted,
              upvoteCount: old.data.hasUpvoted
                ? old.data.upvoteCount - 1
                : old.data.upvoteCount + 1,
            },
          };
        },
      );

      return { previousLists, previousDetail };
    },

    onError: (
      _err,
      postId,
      context,
    ) => {
      context?.previousLists?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data);
      });
      if (context?.previousDetail) {
        qc.setQueryData(
          feedbackKeys.detail(postId),
          context.previousDetail,
        );
      }
    },

    onSettled: (_data, _err, postId) => {
      qc.invalidateQueries({ queryKey: feedbackKeys.detail(postId) });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      feedbackApi.addComment(postId, body),
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: feedbackKeys.detail(postId) });
      qc.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
    }: {
      postId: string;
      commentId: string;
    }) => feedbackApi.deleteComment(postId, commentId),
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: feedbackKeys.detail(postId) });
      qc.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
}


export const handleUpload = async (file: File) => {
  const { data } = await feedbackApi.getUploadSignature(); 
};