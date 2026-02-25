

export interface TemplateVariable {
  name: string;
  description?: string;
  default?: string;
}

export interface Template {
  id: number;
  userId: string;
  name: string;
  subject: string;
  body: string | null;
  variables: TemplateVariable[];
  category: string | null;
  tags: string[];
  usageCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}


export interface CreateTemplatePayload {
  name: string;
  subject: string;
  body?: string;
  variables?: TemplateVariable[];
  category?: string;
  tags?: string[];
}

export interface UpdateTemplatePayload {
  name?: string;
  subject?: string;
  body?: string;
  variables?: TemplateVariable[];
  category?: string;
  tags?: string[];
}

export interface DuplicateTemplatePayload {
  name?: string;
}

export interface ListTemplatesParams {
  category?: string;
  search?: string;
  tags?: string | string[];
  limit?: number;
  offset?: number;
}


export interface GetTemplateResponse {
  success: boolean;
  data: Template;
}

export interface CreateTemplateResponse {
  success: boolean;
  message: string;
  data: Template;
}

export interface UpdateTemplateResponse {
  success: boolean;
  message: string;
  data: Template;
}

export interface DeleteTemplateResponse {
  success: boolean;
  message: string;
}

export interface DuplicateTemplateResponse {
  success: boolean;
  message: string;
  data: Template;
}

export interface ListTemplatesResponse {
  success: boolean;
  data: {
    templates: Template[];
    total: number;
    limit: number;
    offset: number;
  };
}