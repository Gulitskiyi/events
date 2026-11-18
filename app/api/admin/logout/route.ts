import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, destroySession, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  destroySession(jar.get(COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
