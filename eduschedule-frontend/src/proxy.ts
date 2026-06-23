import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];
const PROTECTED_PATHS = ["/assignments", "/classes", "/subjects", "/teachers", "/timetable"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // If logged in: redirect away from guest-only pages (e.g. /login)
  if (accessToken && isPublic) {
    return NextResponse.redirect(new URL("/timetable", request.url));
  }

  // If not logged in: redirect protected paths to /login
  if (!accessToken && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Unknown paths: redirect based on auth state (skip internal API routes)
  if (!isPublic && !isProtected && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL(accessToken ? "/timetable" : "/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
