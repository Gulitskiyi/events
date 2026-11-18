import { NextResponse } from "next/server";
import { COOKIE, createSession, passwordOk, sessionCookieOptions } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const text = messages[await getLocale()];
  const ip = clientIp(request.headers);
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: text.errTooMany }, { status: 429 });
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.trim().length < 12) {
    return NextResponse.json({ ok: false, error: text.errPasswordShort }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!passwordOk(body?.password || "")) {
    return NextResponse.json({ ok: false, error: text.errPassword }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, createSession(), sessionCookieOptions());
  return response;
}
