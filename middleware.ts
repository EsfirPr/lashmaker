import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/session";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(sessionValue);
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/privacy" ||
    pathname.startsWith("/booking/");

  if (!session && !isPublicPage) {
    return redirectTo(request, "/login");
  }

  if (pathname === "/admin") {
    return session?.role === "master"
      ? redirectTo(request, "/master/dashboard")
      : redirectTo(request, "/login");
  }

  if (pathname.startsWith("/master/dashboard")) {
    return session?.role === "master" ? NextResponse.next() : redirectTo(request, "/login");
  }

  if (pathname.startsWith("/account")) {
    return session?.role === "client" ? NextResponse.next() : redirectTo(request, "/login");
  }

  if (pathname === "/master/login" && session?.role === "master") {
    return redirectTo(request, "/master/dashboard");
  }

  if ((pathname === "/login" || pathname === "/register") && session) {
    return redirectTo(request, session.role === "master" ? "/master/dashboard" : "/account");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
