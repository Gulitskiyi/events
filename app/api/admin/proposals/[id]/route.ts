import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { isProposalStatus } from "@/lib/contest";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { getProposalById, updateProposalStatus } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  const { id } = await params;
  const proposal = getProposalById(id);
  if (!proposal) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errProposalMissing") }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = String(body?.status || "");
  if (!isProposalStatus(status)) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errBadData") }, { status: 400 });
  }
  updateProposalStatus(id, status);
  return NextResponse.json({ ok: true, status });
}
