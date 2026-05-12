import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];    // accessible regardless of auth
const PROTECTED_PATHS = ["/", "/assignments", "/classes", "/subjects", "/teachers"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isApiRoute = pathname.startsWith("/api/");
  const isValidProtectedPath = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // If logged in: redirect away from guest-only paths (e.g. /login)
  if (accessToken) {
    if (!isPublic && !isValidProtectedPath && !isApiRoute) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If not logged in: redirect protected paths to /login
  if (!isPublic && !isValidProtectedPath && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
