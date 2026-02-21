import { useSuspenseQuery } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";

export function useCurrentUser() {
  return useSuspenseQuery({
    queryKey: ["user", "me"],
    queryFn: userService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}
