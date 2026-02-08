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

export const validateGetThreadEmails = [
  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  query("size")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Size must be between 1 and 100"),

  query("cursor").optional().isString().withMessage("Cursor must be a string"),

  handleValidationErrors,
];

export const validateGetThreadById = [
  param("threadId")
    .exists()
    .withMessage("threadId is required")
    .isString()
    .withMessage("threadId must be a string")
    .notEmpty()
    .withMessage("threadId cannot be empty"),

  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateGetFolders = [
  query("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  handleValidationErrors,
];

export const validateReplyEmail = [
  body("from")
    .exists()
    .withMessage("from email is required")
    .isEmail()
    .withMessage("Invalid from email format")
    .normalizeEmail(),

  body("provider")
    .exists()
    .withMessage("provider is required")
    .isIn(["GOOGLE", "OUTLOOK"])
    .withMessage("provider must be either 'GOOGLE' or 'OUTLOOK'"),

  body("replyToMessageId")
    .exists()
    .withMessage("replyToMessageId is required")
    .isString()
    .withMessage("replyToMessageId must be a string")
    .notEmpty()
    .withMessage("replyToMessageId cannot be empty"),

  body("html")
    .exists()
    .withMessage("html body is required")
    .isString()
    .withMessage("html must be a string")
    .notEmpty()
    .withMessage("html body cannot be empty"),

  body("mode")
    .optional()
    .isIn(["reply", "reply_all"])
    .withMessage("mode must be either 'reply' or 'reply_all'"),

  body("to")
    .optional()
    .isArray()
    .withMessage("to must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((email: string) => typeof email === "string");
      }
      return true;
    })
    .withMessage("to must be an array of email strings"),

  body("cc")
    .optional()
    .isArray()
    .withMessage("cc must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((email: string) => typeof email === "string");
      }
      return true;
    })
    .withMessage("cc must be an array of email strings"),

  body("bcc")
    .optional()
    .isArray()
    .withMessage("bcc must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((email: string) => typeof email === "string");
      }
      return true;
    })
    .withMessage("bcc must be an array of email strings"),

  body("subject").optional().isString().withMessage("subject must be a string"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("attachments must be an array"),

  handleValidationErrors,
];

export const validateSendEmail = [
  body("from")
    .exists()
    .withMessage("from email is required")
    .isEmail()
    .withMessage("Invalid from email format")
    .normalizeEmail(),

  body("provider")
    .exists()
    .withMessage("provider is required")
    .isIn(["GOOGLE", "OUTLOOK"])
    .withMessage("provider must be either 'GOOGLE' or 'OUTLOOK'"),

  body("to")
    .exists()
    .withMessage("to is required")
    .isArray({ min: 1 })
    .withMessage("to must be a non-empty array")
    .custom((value) => {
      return value.every((email: string) => typeof email === "string");
    })
    .withMessage("to must be an array of email strings"),

  body("subject")
    .exists()
    .withMessage("subject is required")
    .isString()
    .withMessage("subject must be a string")
    .notEmpty()
    .withMessage("subject cannot be empty"),

  body("html")
    .exists()
    .withMessage("html body is required")
    .isString()
    .withMessage("html must be a string")
    .notEmpty()
    .withMessage("html body cannot be empty"),

  body("cc")
    .optional()
    .isArray()
    .withMessage("cc must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((email: string) => typeof email === "string");
      }
      return true;
    })
    .withMessage("cc must be an array of email strings"),

  body("bcc")
    .optional()
    .isArray()
    .withMessage("bcc must be an array")
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every((email: string) => typeof email === "string");
      }
      return true;
    })
    .withMessage("bcc must be an array of email strings"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("attachments must be an array"),

  handleValidationErrors,
];
