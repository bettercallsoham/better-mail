import { Router } from "express";
import { verifyAccessToken } from "../middleware/auth";
import * as feedbackController from "../controllers/feedback.controller";
import * as feedbackValidator from "../validators/feedback.validator";

const router = Router();

router.use(verifyAccessToken());

router.post(
  "/",
  feedbackValidator.validateCreatePost,
  feedbackController.createPost
);
router.get(
  "/",
  feedbackValidator.validateListPosts,
  feedbackController.listPosts
);
router.get(
  "/:postId",
  feedbackValidator.validatePostId,
  feedbackController.getPost
);
router.delete(
  "/:postId",
  feedbackValidator.validatePostId,
  feedbackController.deletePost
);

router.post(
  "/:postId/upvote",
  feedbackValidator.validatePostId,
  feedbackController.toggleUpvote
);

router.post(
  "/:postId/comments",
  feedbackValidator.validateAddComment,
  feedbackController.addComment
);
router.delete(
  "/:postId/comments/:commentId",
  feedbackValidator.validateDeleteComment,
  feedbackController.deleteComment
);

export default router;