import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { deleteDirectoryItem, updateDirectoryItem } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
  }
  const result = updateDirectoryItem(id, {
    code: String(body.code || "").trim().toUpperCase(),
    title: String(body.title || "").trim(),
    search: String(body.search || ""),
    active: Boolean(body.active),
    sortOrder: Number(body.sortOrder || 0),
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  const { id } = await params;
  if (!deleteDirectoryItem(id)) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
