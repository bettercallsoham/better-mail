import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

export function getUserFromToken(token: string): { id: string } | null {
  try {
    const payload = jwtDecode<TokenPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    return { id: payload.userId };
  } catch {
    return null;
  }
}