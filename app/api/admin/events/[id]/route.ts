import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { parseEventInput } from "@/lib/event-input";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { deleteEvent, updateEvent } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  const { id } = await params;
  const parsed = parseEventInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ ok: false, error: errorText(locale, parsed.error) }, { status: 400 });
  const updated = updateEvent(id, parsed.value);
  if (!updated.ok) return NextResponse.json({ ok: false, error: errorText(locale, updated.error) }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  const { id } = await params;
  if (!deleteEvent(id)) return NextResponse.json({ ok: false, error: errorText(locale, "errEventMissing") }, { status: 404 });
  return NextResponse.json({ ok: true });
}
