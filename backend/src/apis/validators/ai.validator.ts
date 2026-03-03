import { Request, Response, NextFunction } from "express";
import { body, query, param } from "express-validator";
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

export const validateThreadSummarization = [
  param("threadId")
    .exists()
    .withMessage("threadId is required")
    .isString()
    .withMessage("threadId must be a string")
    .notEmpty()
    .withMessage("threadId cannot be empty"),

  body("emailAddress")
    .exists()
    .withMessage("emailAddress is required")
    .isEmail()
    .withMessage("emailAddress must be a valid email"),

  body("forceRefresh")
    .optional()
    .isBoolean()
    .withMessage("forceRefresh must be a boolean"),

  handleValidationErrors,
];
export const validateRagChat = [
  body("query")
    .exists()
    .withMessage("query is required")
    .isString()
    .withMessage("query must be a string")
    .notEmpty()
    .withMessage("query cannot be empty")
    .isLength({ min: 3, max: 500 })
    .withMessage("query must be between 3 and 500 characters"),

  body("emailAddress")
    .exists()
    .withMessage("emailAddress is required")
    .isEmail()
    .withMessage("emailAddress must be a valid email"),

  body("conversationHistory")
    .optional()
    .isArray()
    .withMessage("conversationHistory must be an array"),

  body("filters")
    .optional()
    .isObject()
    .withMessage("filters must be an object"),

  body("filters.dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid ISO 8601 date"),

  body("filters.dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid ISO 8601 date"),

  body("filters.from")
    .optional()
    .isString()
    .withMessage("from must be a string"),

  body("filters.labels")
    .optional()
    .isArray()
    .withMessage("labels must be an array"),

  handleValidationErrors,
];

export const validateReplySuggestion = [
  param("threadId")
    .exists()
    .withMessage("threadId is required")
    .isString()
    .withMessage("threadId must be a string")
    .notEmpty()
    .withMessage("threadId cannot be empty"),

  body("emailAddress")
    .exists()
    .withMessage("emailAddress is required")
    .isEmail()
    .withMessage("emailAddress must be a valid email"),

  body("tone")
    .optional()
    .isIn(["formal", "friendly", "brief", "empathetic"])
    .withMessage("tone must be one of: formal, friendly, brief, empathetic"),

  handleValidationErrors,
];

export const validateSuggestEmail = [
  body("mode")
    .exists()
    .withMessage("mode is required")
    .isIn(["compose", "rewrite", "refine"])
    .withMessage("mode must be one of: compose, rewrite, refine"),

  body("topic")
    .if(body("mode").equals("compose"))
    .exists()
    .withMessage("topic is required when mode is compose")
    .isString()
    .withMessage("topic must be a string")
    .notEmpty()
    .withMessage("topic cannot be empty")
    .isLength({ max: 1000 })
    .withMessage("topic must be at most 1000 characters"),

  body("draft")
    .if((req: import("express").Request) =>
      ["rewrite", "refine"].includes(req.body?.mode),
    )
    .exists()
    .withMessage("draft is required when mode is rewrite or refine")
    .isString()
    .withMessage("draft must be a string")
    .notEmpty()
    .withMessage("draft cannot be empty")
    .isLength({ max: 10000 })
    .withMessage("draft must be at most 10000 characters"),

  body("refineInstruction")
    .if(body("mode").equals("refine"))
    .exists()
    .withMessage("refineInstruction is required when mode is refine")
    .isString()
    .withMessage("refineInstruction must be a string")
    .notEmpty()
    .withMessage("refineInstruction cannot be empty")
    .isLength({ max: 500 })
    .withMessage("refineInstruction must be at most 500 characters"),

  body("tone")
    .optional()
    .isIn(["formal", "friendly", "concise", "professional", "empathetic"])
    .withMessage(
      "tone must be one of: formal, friendly, concise, professional, empathetic",
    ),

  body("recipientName")
    .optional()
    .isString()
    .withMessage("recipientName must be a string")
    .isLength({ max: 100 })
    .withMessage("recipientName must be at most 100 characters"),

  body("subjectHint")
    .optional()
    .isString()
    .withMessage("subjectHint must be a string")
    .isLength({ max: 200 })
    .withMessage("subjectHint must be at most 200 characters"),

  body("senderEmail")
    .optional()
    .isEmail()
    .withMessage("senderEmail must be a valid email address")
    .normalizeEmail(),

  handleValidationErrors,
];
