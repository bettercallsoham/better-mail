import { apiClient } from "@/lib/api/client";
import {
  CreateTemplatePayload,
  CreateTemplateResponse,
  DeleteTemplateResponse,
  DuplicateTemplatePayload,
  DuplicateTemplateResponse,
  GetTemplateResponse,
  ListTemplatesParams,
  ListTemplatesResponse,
  UpdateTemplatePayload,
  UpdateTemplateResponse,
} from "./templates.types";

export const templatesService = {
  list: (params?: ListTemplatesParams) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append("category", params.category);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.tags) {
      const tags = Array.isArray(params.tags) ? params.tags : [params.tags];
      tags.forEach((tag) => searchParams.append("tags", tag));
    }
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.offset) searchParams.append("offset", String(params.offset));

    const qs = searchParams.toString();
    const url = qs ? `/templates?${qs}` : `/templates`;

    return apiClient<ListTemplatesResponse>(url);
  },

  getById: (id: number) => {
    return apiClient<GetTemplateResponse>(`/templates/${id}`);
  },

  create: (payload: CreateTemplatePayload) => {
    return apiClient<CreateTemplateResponse>(`/templates`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: (id: number, payload: UpdateTemplatePayload) => {
    return apiClient<UpdateTemplateResponse>(`/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete: (id: number) => {
    return apiClient<DeleteTemplateResponse>(`/templates/${id}`, {
      method: "DELETE",
    });
  },

  duplicate: (id: number, payload?: DuplicateTemplatePayload) => {
    return apiClient<DuplicateTemplateResponse>(`/templates/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    });
  },
};