import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { reminderLabel } from "@/lib/labels";
import { getLocale } from "@/lib/current-locale";
import { countryLabel, errorText, messages } from "@/lib/messages";
import { getEventById, listRegistrations } from "@/lib/store";

function cell(value: string) {
  let safe = value.replace(/[\r\n]/g, " ");
  if (/^[=+\-@\t]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  const text = messages[locale];
  if (!(await isAuthed())) return NextResponse.json({ ok: false, error: errorText(locale, "needAuth") }, { status: 401 });
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ ok: false, error: errorText(locale, "errEventMissing") }, { status: 404 });

  const header = [text.colName, text.colCompany, text.colCountry, text.colPhone, text.colPosition, text.email, text.colReminder, text.colCreated];
  const lines = listRegistrations(event.id).map((row) =>
    [
      row.full_name,
      row.company,
      countryLabel(locale, row.country),
      row.phone,
      row.position,
      row.email,
      reminderLabel(row, event.starts_at, locale),
      formatDateTime(row.created_at, locale),
    ]
      .map(cell)
      .join(";"),
  );
  const csv = `\uFEFF${header.join(";")}\n${lines.join("\n")}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${event.slug}.csv"`,
    },
  });
}
