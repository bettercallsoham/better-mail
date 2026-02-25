import { useSuspenseQuery } from "@tanstack/react-query";
import { userService } from "./user.api";

export function useCurrentUser() {
  return useSuspenseQuery({
    queryKey: ["user", "me"],
    queryFn: userService.getCurrentUser,
    staleTime: Infinity, 
    retry: false,
  });
}