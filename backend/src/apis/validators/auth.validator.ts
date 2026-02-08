import { Request, Response, NextFunction } from "express";
import { body, query, param } from "express-validator";
import { validationResult } from "express-validator";
import createError from "http-errors";

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessage = errors.array()[0].msg;
    throw createError.BadRequest(errorMessage);
  }
  next();
};

export const validateSignupUser = [
  body("fullName")
    .if(body("auth_provider").equals("email"))
    .exists({ checkFalsy: true })
    .isString()
    .withMessage("First name is required for email auth")
    .isLength({ min: 3, max: 100 })
    .withMessage("First name must be between 3 and 100 characters"),

  body("email")
    .exists()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("password")
    .exists()
    .isString()
    .withMessage("Password is required for email auth")
    .isLength({ min: 8, max: 100 })
    .withMessage("Password must be between 8 and 100 characters"),

  body("avatar").optional().isString().withMessage("Avatar must be a string"),

  handleValidationErrors,
];

export const validateLoginUser = [
  body("email")
    .exists()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("password")
    .if(body("auth_provider").equals("email"))
    .exists()
    .withMessage("Password is required for email auth")
    .isLength({ min: 8, max: 100 })
    .withMessage("Password must be between 8 and 100 characters"),

  handleValidationErrors,
];

export const validateUpdateAccount = [
  body("fullName")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Full name must be 3–200 characters"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("currentPassword")
    .optional()
    .isString()
    .withMessage("Current password must be a string"),

  body("newPassword")
    .optional()
    .isLength({ min: 8, max: 100 })
    .withMessage("New password must be 8–100 characters"),

  body().custom((_, { req }) => {
    const { fullName, email, newPassword } = req.body;
    if (!fullName && !email && !newPassword) {
      throw new Error(
        "At least one of fullName, email, or newPassword must be provided"
      );
    }
    return true;
  }),

  body().custom((_, { req }) => {
    const { newPassword, currentPassword } = req.body;
    if (newPassword && !currentPassword) {
      throw new Error("Current password is required to set a new password");
    }
    return true;
  }),

  handleValidationErrors,
];
