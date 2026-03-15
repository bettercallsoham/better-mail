import { Request, Response } from "express";
import { FeedbackService } from "../services/feedback.service";
import { asyncHandler } from "../utils/asyncHandler";
import { PostType } from "../../shared/models/feedback/feedback_post.model";
import cloudinary from "../../shared/config/cloudinary";

const feedbackService = new FeedbackService();

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const post = await feedbackService.createPost(userId, req.body);
  res.status(201).json({ success: true, data: post });
}, "createPost");

export const listPosts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const result = await feedbackService.listPosts(userId, {
    type: req.query.type as PostType | undefined,
    sort: req.query.sort as "top" | "new" | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });

  res.json({ success: true, ...result });
}, "listPosts");

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params as { postId: string };

  if (!postId) {
    return res.status(400).json({
      success: false,
      message: "PostId is missing",
    });
  }

  const post = await feedbackService.getPost(req.user!.id, postId);
  res.json({ success: true, data: post });
}, "getPost");

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params as { postId: string };
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: "PostId is missing",
    });
  }

  await feedbackService.deletePost(req.user!.id, postId);
  res.json({ success: true, message: "Post deleted" });
}, "deletePost");

export const toggleUpvote = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId } = req.params as { postId: string };
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "PostId is missing",
      });
    }

    const result = await feedbackService.toggleUpvote(req.user!.id, postId);
    res.json({ success: true, data: result });
  },
  "toggleUpvote",
);

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params as { postId: string };
  if (!postId) {
    return res.status(400).json({
      success: false,
      message: "PostId is missing",
    });
  }

  const comment = await feedbackService.addComment(
    req.user!.id,
    postId,
    req.body.body,
  );
  res.status(201).json({ success: true, data: comment });
}, "addComment");

export const deleteComment = asyncHandler(
  async (req: Request, res: Response) => {
    const { postId, commentId } = req.params as {
      postId: string;
      commentId: string;
    };

    if (!postId || !commentId) {
      return res.status(400).json({
        success: false,
        message: "PostId is missing",
      });
    }

    await feedbackService.deleteComment(req.user!.id, postId, commentId);
    res.json({ success: true, message: "Comment deleted" });
  },
  "deleteComment",
);


export const getUploadSignature = asyncHandler(
  async (req: Request, res: Response) => {
    const timestamp = Math.round(Date.now() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: "feedback" },
      cloudinary.config().api_secret!
    );

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        apiKey: cloudinary.config().api_key,
        cloudName: cloudinary.config().cloud_name,
        folder: "feedback",
      },
    });
  },
  "getUploadSignature"
);