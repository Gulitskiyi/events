import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { formatDateTime } from "@/lib/format";
import { errorText, messages } from "@/lib/messages";
import { getEventById, listAllProposals } from "@/lib/store";

function cell(value: string) {
  let safe = value.replace(/[\r\n]/g, " ");
  if (/^[=+\-@\t]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

function statusLabel(locale: "ru" | "en" | "kk", status: string) {
  const text = messages[locale];
  if (status === "reviewing") return text.statusReviewing;
  if (status === "approved") return text.statusApproved;
  if (status === "rejected") return text.statusRejected;
  return text.statusReceived;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  const text = messages[locale];
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  }
  const { id } = await params;
  const event = getEventById(id);
  if (!event) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errEventMissing") }, { status: 404 });
  }

  const header = [
    text.colNumber,
    text.colContract,
    text.colCategory,
    text.asset,
    text.eventQuestion,
    text.condition,
    text.settlement,
    text.comment,
    text.lastName,
    text.firstName,
    text.colCompany,
    text.colPosition,
    text.email,
    text.colPhone,
    text.colStatus,
    text.colVotes,
    text.colCreated,
  ];

  const lines = listAllProposals(event.id).map((row) =>
    [
      String(row.number),
      row.title,
      row.category,
      row.asset_label,
      row.event_question,
      `${row.condition_op} ${row.condition_value}`.trim(),
      row.settlement_at,
      row.comment,
      row.last_name,
      row.first_name,
      row.company,
      row.position,
      row.email,
      row.phone,
      statusLabel(locale, row.status),
      String(row.votes),
      formatDateTime(row.created_at, locale),
    ]
      .map(cell)
      .join(";"),
  );

  const csv = `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="proposals-${event.slug}.csv"`,
    },
  });
}
