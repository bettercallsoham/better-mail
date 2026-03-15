import { Request, Response, NextFunction } from "express";
import { body, query, param } from "express-validator";
import { validationResult } from "express-validator";
import createError from "http-errors";
import { PostType } from "../../shared/models/feedback/feedback_post.model";

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError.BadRequest(errors.array()[0].msg);
  }
  next();
};

export const validateCreatePost = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must be under 255 characters"),

  body("description").trim().notEmpty().withMessage("Description is required"),

  body("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(Object.values(PostType))
    .withMessage("Invalid post type"),

  body("attachments")
    .optional()
    .isArray({ max: 5 })
    .withMessage("Max 5 attachments allowed")
    .custom((arr: any[]) => arr.every((url) => typeof url === "string"))
    .withMessage("Each attachment must be a valid URL string"),

  handleValidationErrors,
];

export const validateListPosts = [
  query("type")
    .optional()
    .isIn(Object.values(PostType))
    .withMessage("Invalid post type"),

  query("sort")
    .optional()
    .isIn(["top", "new"])
    .withMessage("sort must be 'top' or 'new'"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50")
    .toInt(),

  handleValidationErrors,
];

export const validatePostId = [
  param("postId").isUUID().withMessage("Invalid post ID"),

  handleValidationErrors,
];

export const validateAddComment = [
  param("postId").isUUID().withMessage("Invalid post ID"),

  body("body")
    .trim()
    .notEmpty()
    .withMessage("Comment body is required")
    .isLength({ max: 1000 })
    .withMessage("Comment must be under 1000 characters"),

  handleValidationErrors,
];

export const validateDeleteComment = [
  param("postId").isUUID().withMessage("Invalid post ID"),

  param("commentId").isUUID().withMessage("Invalid comment ID"),

  handleValidationErrors,
];
