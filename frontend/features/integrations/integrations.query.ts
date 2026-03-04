import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationsService } from "./integrations.api";

export const integrationKeys = {
  all: ["integrations"] as const,
};

export function useIntegrations() {
  return useQuery({
    queryKey: integrationKeys.all,
    queryFn: () => integrationsService.getAll(),
    staleTime: 60 * 1000,
    select: (res) => res.data,
  });
}

export function useGetTelegramLink() {
  return useMutation({
    mutationFn: () => integrationsService.getTelegramLink(),
  });
}

export function useDisconnectTelegram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsService.disconnectTelegram(),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}
