import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { emailTemplateService } from "../../shared/services/template/email-template.service";

/**
 * Create a new email template
 * POST /api/v1/templates
 */
export const createTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { name, subject, body, variables, category, tags } = req.body;

    const template = await emailTemplateService.createTemplate(userId, {
      name,
      subject,
      body,
      variables,
      category,
      tags,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  },
  "createTemplate",
);

/**
 * Get all templates for current user
 * GET /api/v1/templates
 */
export const getTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    const { category, search, tags, limit, offset } = req.query;

    const parsedTags = tags
      ? typeof tags === "string"
        ? [tags]
        : (tags as string[])
      : undefined;

    const { templates, total } = await emailTemplateService.listTemplates(
      userId,
      {
        category: category as string,
        search: search as string,
        tags: parsedTags,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        templates,
        total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  },
  "getTemplates",
);

/**
 * Get a single template by ID
 * GET /api/v1/templates/:id
 */
export const getTemplateById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = parseInt(req.params.id as string);

    const template = await emailTemplateService.getTemplateById(
      templateId,
      userId,
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  },
  "getTemplateById",
);

/**
 * Update a template
 * PATCH /api/v1/templates/:id
 */
export const updateTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = parseInt(req.params.id as string);
    const { name, subject, body, variables, category, tags } = req.body;

    const template = await emailTemplateService.updateTemplate(
      templateId,
      userId,
      {
        name,
        subject,
        body,
        variables,
        category,
        tags,
      },
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  },
  "updateTemplate",
);

/**
 * Delete a template
 * DELETE /api/v1/templates/:id
 */
export const deleteTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = parseInt(req.params.id as string);

    const deleted = await emailTemplateService.deleteTemplate(
      templateId,
      userId,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  },
  "deleteTemplate",
);

/**
 * Duplicate a template
 * POST /api/v1/templates/:id/duplicate
 */
export const duplicateTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = parseInt(req.params.id as string);
    const { name } = req.body;

    const duplicated = await emailTemplateService.duplicateTemplate(
      templateId,
      userId,
      name,
    );

    if (!duplicated) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(201).json({
      success: true,
      message: "Template duplicated successfully",
      data: duplicated,
    });
  },
  "duplicateTemplate",
);
