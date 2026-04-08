import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/timetable"];
const PROTECTED_PATHS = ["/", "/assignments", "/classes", "/subjects", "/teachers"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and API routes
  const accessToken = request.cookies.get("access_token")?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isApiRoute = pathname.startsWith("/api/");
  const isValidProtectedPath = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // If logged in:
  if (accessToken) {
    // Redirect to home if path is public (guest-only) OR undefined (not protected and not api)
    if (isPublicPath || (!isValidProtectedPath && !isApiRoute)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If not logged in:
  // Redirect to /timetable for any non-public route (including undefined ones)
  if (!isPublicPath && !isApiRoute) {
    return NextResponse.redirect(new URL("/timetable", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
