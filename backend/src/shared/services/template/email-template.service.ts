import {
  EmailTemplate,
  TemplateVariable,
} from "../../models/email-template.model";
import { Op } from "sequelize";

export interface CreateTemplateData {
  name: string;
  subject: string;
  body?: string;
  variables?: TemplateVariable[];
  category?: string;
  tags?: string[];
}

export interface UpdateTemplateData {
  name?: string;
  subject?: string;
  body?: string;
  variables?: TemplateVariable[];
  category?: string;
  tags?: string[];
}

export interface ListTemplatesFilters {
  category?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export class EmailTemplateService {
  /**
   * Create a new email template
   */
  async createTemplate(
    userId: string,
    data: CreateTemplateData,
  ): Promise<EmailTemplate> {
    const template = await EmailTemplate.create({
      userId,
      name: data.name,
      subject: data.subject,
      body: data.body || null,
      variables: data.variables || [],
      category: data.category || null,
      tags: data.tags || [],
    });

    return template;
  }

  /**
   * Get template by ID (with ownership check)
   */
  async getTemplateById(
    templateId: number,
    userId: string,
  ): Promise<EmailTemplate | null> {
    const template = await EmailTemplate.findOne({
      where: {
        id: templateId,
        userId,
      },
    });

    return template;
  }

  /**
   * List all templates for a user with optional filters
   */
  async listTemplates(
    userId: string,
    filters: ListTemplatesFilters = {},
  ): Promise<{ templates: EmailTemplate[]; total: number }> {
    const where: any = { userId };

    // Filter by category
    if (filters.category) {
      where.category = filters.category;
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        [Op.overlap]: filters.tags,
      };
    }

    // Search by name or subject
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { subject: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const { rows: templates, count: total } =
      await EmailTemplate.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ["usageCount", "DESC"],
          ["updatedAt", "DESC"],
        ],
      });

    return { templates, total };
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: number,
    userId: string,
    data: UpdateTemplateData,
  ): Promise<EmailTemplate | null> {
    const template = await this.getTemplateById(templateId, userId);

    if (!template) {
      return null;
    }

    // Update fields
    if (data.name !== undefined) template.name = data.name;
    if (data.subject !== undefined) template.subject = data.subject;
    if (data.body !== undefined) template.body = data.body || null;
    if (data.variables !== undefined) template.variables = data.variables;
    if (data.category !== undefined) template.category = data.category;
    if (data.tags !== undefined) template.tags = data.tags;

    // Increment version on content changes
    if (data.subject || data.body !== undefined) {
      template.version = template.version + 1;
    }

    await template.save();

    return template;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: number, userId: string): Promise<boolean> {
    const result = await EmailTemplate.destroy({
      where: {
        id: templateId,
        userId,
      },
    });

    return result > 0;
  }

  /**
   * Duplicate an existing template
   */
  async duplicateTemplate(
    templateId: number,
    userId: string,
    newName?: string,
  ): Promise<EmailTemplate | null> {
    const template = await this.getTemplateById(templateId, userId);

    if (!template) {
      return null;
    }

    const duplicated = await EmailTemplate.create({
      userId,
      name: newName || `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body,
      variables: template.variables,
      category: template.category,
      tags: template.tags,
    });

    return duplicated;
  }
}

export const emailTemplateService = new EmailTemplateService();
