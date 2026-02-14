import { body, param } from "express-validator";

export const validateCreateMessage = [
  param("conversationId")
    .isUUID()
    .withMessage("Invalid conversation ID format"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 5000 })
    .withMessage("Message content must not exceed 5000 characters"),
];
