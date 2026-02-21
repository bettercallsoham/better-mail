import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_COOKIE)?.value;

  const isProtected = pathname.startsWith("/app");
  const isLoginPage = pathname === "/auth";

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/auth"],
};
