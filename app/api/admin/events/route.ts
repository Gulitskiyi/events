import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { parseEventInput } from "@/lib/event-input";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { createEvent } from "@/lib/store";

export async function POST(request: Request) {
  const locale = await getLocale();
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  const parsed = parseEventInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ ok: false, error: errorText(locale, parsed.error) }, { status: 400 });
  const created = createEvent(parsed.value);
  if (!created.ok) return NextResponse.json({ ok: false, error: errorText(locale, created.error) }, { status: 400 });
  return NextResponse.json({ ok: true, id: created.id });
}
