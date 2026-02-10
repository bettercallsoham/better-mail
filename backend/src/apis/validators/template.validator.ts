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

export const validateCreateTemplate = [
  body("name")
    .exists()
    .withMessage("Template name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),

  body("subject")
    .exists()
    .withMessage("Subject is required")
    .isString()
    .withMessage("Subject must be a string")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Subject must be between 1 and 500 characters"),

  body("bodyHtml")
    .exists()
    .withMessage("HTML body is required")
    .isString()
    .withMessage("HTML body must be a string")
    .notEmpty()
    .withMessage("HTML body cannot be empty"),

  body("bodyText")
    .exists()
    .withMessage("Text body is required")
    .isString()
    .withMessage("Text body must be a string")
    .notEmpty()
    .withMessage("Text body cannot be empty"),

  body("variables")
    .optional()
    .isArray()
    .withMessage("Variables must be an array"),

  body("variables.*.name")
    .optional()
    .isString()
    .withMessage("Variable name must be a string"),

  body("variables.*.description")
    .optional()
    .isString()
    .withMessage("Variable description must be a string"),

  body("variables.*.default")
    .optional()
    .isString()
    .withMessage("Variable default must be a string"),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string")
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*").optional().isString().withMessage("Each tag must be a string"),

  handleValidationErrors,
];

export const validateUpdateTemplate = [
  param("id")
    .exists()
    .withMessage("Template ID is required")
    .isInt()
    .withMessage("Template ID must be an integer"),

  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),

  body("subject")
    .optional()
    .isString()
    .withMessage("Subject must be a string")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Subject must be between 1 and 500 characters"),

  body("bodyHtml")
    .optional()
    .isString()
    .withMessage("HTML body must be a string")
    .notEmpty()
    .withMessage("HTML body cannot be empty"),

  body("bodyText")
    .optional()
    .isString()
    .withMessage("Text body must be a string")
    .notEmpty()
    .withMessage("Text body cannot be empty"),

  body("variables")
    .optional()
    .isArray()
    .withMessage("Variables must be an array"),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string")
    .isLength({ max: 100 })
    .withMessage("Category must be less than 100 characters"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  handleValidationErrors,
];

export const validateGetTemplateById = [
  param("id")
    .exists()
    .withMessage("Template ID is required")
    .isInt()
    .withMessage("Template ID must be an integer"),

  handleValidationErrors,
];

export const validateDeleteTemplate = [
  param("id")
    .exists()
    .withMessage("Template ID is required")
    .isInt()
    .withMessage("Template ID must be an integer"),

  handleValidationErrors,
];

export const validateRenderTemplate = [
  param("id")
    .exists()
    .withMessage("Template ID is required")
    .isInt()
    .withMessage("Template ID must be an integer"),

  body("variables")
    .optional()
    .isObject()
    .withMessage("Variables must be an object"),

  handleValidationErrors,
];

export const validateDuplicateTemplate = [
  param("id")
    .exists()
    .withMessage("Template ID is required")
    .isInt()
    .withMessage("Template ID must be an integer"),

  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),

  handleValidationErrors,
];

export const validateListTemplates = [
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),

  query("search").optional().isString().withMessage("Search must be a string"),

  query("tags")
    .optional()
    .custom((value) => {
      if (typeof value === "string" || Array.isArray(value)) {
        return true;
      }
      throw new Error("Tags must be a string or array");
    }),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),

  handleValidationErrors,
];
