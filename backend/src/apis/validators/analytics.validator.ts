import { Request, Response, NextFunction } from "express";
import { query } from "express-validator";
import { validationResult } from "express-validator";
import createError from "http-errors";

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array()[0].msg;
    throw createError.BadRequest(errorMessage);
  }
  next();
};

export const validateAnalyticsOverview = [
  query("period")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("period must be one of: daily, weekly, monthly"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateTimePatterns = [
  query("period")
    .optional()
    .isIn(["weekly", "monthly"])
    .withMessage("period must be one of: weekly, monthly"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateSenderAnalytics = [
  query("period")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("period must be one of: daily, weekly, monthly"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateInboxHealth = [
  query("period")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("period must be one of: daily, weekly, monthly"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateResponseAnalytics = [
  query("period")
    .optional()
    .isIn(["weekly", "monthly"])
    .withMessage("period must be one of: weekly, monthly"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];
