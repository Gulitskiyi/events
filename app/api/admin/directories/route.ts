import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { isContestCategory } from "@/lib/contest";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import {
  createDirectoryItem,
  getContestSettings,
  listDirectoryItems,
  updateContestSettings,
} from "@/lib/store";

export async function GET() {
  const locale = await getLocale();
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    items: listDirectoryItems(),
    settings: getContestSettings(),
  });
}

export async function POST(request: Request) {
  const locale = await getLocale();
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
  }

  if (body.action === "settings") {
    const green = String(body.green_list_url || "").trim();
    const stocks = String(body.its_stocks_url || "").trim();
    if (!green || !stocks) {
      return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
    }
    updateContestSettings({ green_list_url: green, its_stocks_url: stocks });
    return NextResponse.json({ ok: true });
  }

  const category = String(body.category || "");
  const code = String(body.code || "").trim().toUpperCase();
  const title = String(body.title || "").trim();
  if (!isContestCategory(category) || code.length < 1 || title.length < 1) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
  }
  const created = createDirectoryItem({ category, code, title, search: String(body.search || "") });
  if (!created.ok) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 409 });
  }
  return NextResponse.json({ ok: true, id: created.id });
}
