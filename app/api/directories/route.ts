import { NextResponse } from "next/server";
import { isContestCategory } from "@/lib/contest";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { listDirectoryItems } from "@/lib/store";

export async function GET(request: Request) {
  const locale = await getLocale();
  const category = new URL(request.url).searchParams.get("category") || "";
  if (!isContestCategory(category)) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errCategory") }, { status: 400 });
  }
  const items = listDirectoryItems(category, true).map((item) => ({
    code: item.code,
    title: item.title,
    search: item.search,
  }));
  return NextResponse.json({ ok: true, items });
}
