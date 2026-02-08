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
