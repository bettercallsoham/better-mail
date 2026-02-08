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
  body("mailboxId")
    .optional()
    .isString()
    .withMessage("mailboxId must be a string")
    .isLength({ min: 3, max: 100 })
    .withMessage("mailboxId must be between 3 and 100 characters"),

  handleValidationErrors,
];
