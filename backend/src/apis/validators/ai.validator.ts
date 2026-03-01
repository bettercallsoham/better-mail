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
