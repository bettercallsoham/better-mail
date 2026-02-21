import { apiClient } from "../../lib/api/client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  signupMethod: "google" | "microsoft";
  avatar: string;
}

export interface GetCurrentUserResponse {
  success: boolean;
  message: string;
  user: User;
}

export const userService = {
  getCurrentUser: () => apiClient<GetCurrentUserResponse>("/auth/user"),
};
