import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { processReminders } from "@/lib/reminders";
import { resetFailedReminders } from "@/lib/store";

export async function POST(request: Request) {
  const locale = await getLocale();
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action === "retry") resetFailedReminders();
  const result = await processReminders();
  return NextResponse.json({ ok: true, ...result });
}
