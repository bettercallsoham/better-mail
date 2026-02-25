import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  CreateTemplatePayload,
  DuplicateTemplatePayload,
  ListTemplatesParams,
  UpdateTemplatePayload,
} from "./templates.types";
import { templatesService } from "./templates.api";

export const templateKeys = {
  all: ["templates"] as const,

  lists: () => [...templateKeys.all, "list"] as const,
  list: (params?: ListTemplatesParams) =>
    [...templateKeys.lists(), params] as const,

  details: () => [...templateKeys.all, "detail"] as const,
  detail: (id: number) => [...templateKeys.details(), id] as const,
};

export function useTemplates(params?: ListTemplatesParams) {
  return useSuspenseQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templatesService.list(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useTemplate(id: number) {
  return useSuspenseQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templatesService.getById(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (res) => res.data,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      templatesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

export function useUpdateTemplate(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTemplatePayload) =>
      templatesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => templatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload?: DuplicateTemplatePayload;
    }) => templatesService.duplicate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}
