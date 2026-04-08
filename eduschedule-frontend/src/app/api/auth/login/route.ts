import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_URL;

const ACCESS_MAX_AGE = 60 * 60 * 24;       // 1 day (matches backend jwt.expiration)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;  // 7 days

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return NextResponse.json({ error: errorData }, { status: res.status });
  }

  const data = await res.json();
  const response = NextResponse.json({ username: data.username });

  response.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });

  response.cookies.set("refresh_token", data.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });

  return response;
}
