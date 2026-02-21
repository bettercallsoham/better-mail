import { apiClient } from "../client";

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
  getCurrentUser: () => apiClient<GetCurrentUserResponse>("/api/v1/auth/user"),
};
