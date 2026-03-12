import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth/getUserFromToken";

const AUTH_COOKIE = "access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = token ? getUserFromToken(token) : null;

  const isProtected = pathname.startsWith("/app");
  const isAuthPage = pathname === "/auth";

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && (pathname === "/" || isAuthPage)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/auth"],
};
