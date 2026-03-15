import { Op, OrderItem } from "sequelize";
import createError from "http-errors";
import {
  FeedbackPost,
  PostType,
} from "../../shared/models/feedback/feedback_post.model";
import { User } from "../../shared/models";
import { FeedbackUpvote } from "../../shared/models/feedback/feedback_upvote.model";
import { FeedbackComment } from "../../shared/models/feedback/feedback_comment.model";
import { sequelize } from "../../shared/config/db";

interface CreatePostDto {
  title: string;
  description: string;
  type: PostType;
  attachments?: string[];
}

interface ListPostsFilters {
  type?: PostType;
  sort?: "top" | "new";
  page?: number;
  limit?: number;
}

const AUTHOR_ATTRIBUTES = ["fullName", "avatar"];

export class FeedbackService {
  async createPost(userId: string, dto: CreatePostDto): Promise<FeedbackPost> {
    return FeedbackPost.create({
      userId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      attachments: dto.attachments ?? [],
    });
  }

  async listPosts(userId: string, filters: ListPostsFilters) {
    const { type, sort = "new", page = 1, limit = 20 } = filters;

    const offset = (page - 1) * limit;

    const order: OrderItem[] =
      sort === "top"
        ? [
            ["upvoteCount", "DESC"],
            ["created_at", "DESC"],
          ]
        : [["created_at", "DESC"]];

    const where: any = {};
    if (type) where.type = type;

    const { count, rows: posts } = await FeedbackPost.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "author",
          attributes: AUTHOR_ATTRIBUTES,
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const upvotedPostIds = new Set(
      (
        await FeedbackUpvote.findAll({
          where: { userId, postId: posts.map((p) => p.id) },
          attributes: ["postId"],
        })
      ).map((u) => u.postId),
    );

    return {
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      data: posts.map((p) => ({
        ...p.toJSON(),
        hasUpvoted: upvotedPostIds.has(p.id),
      })),
    };
  }

  async getPost(userId: string, postId: string) {
    const post = await FeedbackPost.findByPk(postId, {
      include: [
        {
          model: User,
          as: "author",
          attributes: AUTHOR_ATTRIBUTES,
        },
        {
          model: FeedbackComment,
          as: "comments",
          required: false,
          where: { deleted_at: null },
          include: [
            {
              model: User,
              as: "author",
              attributes: AUTHOR_ATTRIBUTES,
            },
          ],
          order: [["created_at", "ASC"]],
        },
      ],
    });

    if (!post) throw createError.NotFound("Post not found");

    const upvote = await FeedbackUpvote.findOne({
      where: { postId, userId },
      attributes: ["id"],
    });

    return {
      ...post.toJSON(),
      hasUpvoted: !!upvote,
    };
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await FeedbackPost.findByPk(postId, {
      attributes: ["id", "userId"],
    });

    if (!post) throw createError.NotFound("Post not found");
    if (post.userId !== userId) throw createError.Forbidden("Not your post");

    await post.destroy();
  }

  async toggleUpvote(
    userId: string,
    postId: string,
  ): Promise<{ upvoted: boolean; upvoteCount: number }> {
    const post = await FeedbackPost.findByPk(postId, {
      attributes: ["id", "upvoteCount"],
    });

    if (!post) throw createError.NotFound("Post not found");

    const [, created] = await FeedbackUpvote.findOrCreate({
      where: { postId, userId },
    });

    if (created) {
      await post.increment("upvoteCount");
      return { upvoted: true, upvoteCount: post.upvoteCount + 1 };
    }

    await FeedbackUpvote.destroy({ where: { postId, userId } });
    await post.decrement("upvoteCount");
    return { upvoted: false, upvoteCount: Math.max(0, post.upvoteCount - 1) };
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async addComment(userId: string, postId: string, body: string) {
    const post = await FeedbackPost.findByPk(postId, {
      attributes: ["id"],
    });

    if (!post) throw createError.NotFound("Post not found");

    const comment = await sequelize.transaction(async (t) => {
      const newComment = await FeedbackComment.create(
        { postId, userId, body },
        { transaction: t },
      );
      await post.increment("commentCount", { transaction: t });
      return newComment;
    });

    return FeedbackComment.findByPk(comment.id, {
      include: [{ model: User, as: "author", attributes: AUTHOR_ATTRIBUTES }],
    });
  }

  async deleteComment(
    userId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    const comment = await FeedbackComment.findOne({
      where: { id: commentId, postId },
      attributes: ["id", "userId"],
    });

    if (!comment) throw createError.NotFound("Comment not found");
    if (comment.userId !== userId)
      throw createError.Forbidden("Not your comment");

    await sequelize.transaction(async (t) => {
      await comment.destroy({ transaction: t });
      await FeedbackPost.decrement("commentCount", {
        by: 1,
        where: { id: postId },
        transaction: t,
      });
    });
  }
}
