import { formatRange } from "./format";
import { buildIcs } from "./ics";
import { parseLocale } from "./locale";
import { deliverReminder, smtpConfig } from "./mail";
import { fill, messages } from "./messages";
import { reminderPhase } from "./reminder-time";
import { listReminderCandidates, setReminderStatus } from "./store";

let running = false;

function messageFor(row: Awaited<ReturnType<typeof listReminderCandidates>>[number]) {
  const locale = parseLocale(row.lang);
  const text = messages[locale];
  const range = formatRange(row.starts_at, row.ends_at, locale);
  const when = range.time ? `${range.date}, ${range.time}` : range.date;
  const start = new Date(row.starts_at).getTime();
  const hoursLeft = (start - Date.now()) / 36e5;
  const lead = hoursLeft >= 36 ? text.mailTwoDays : text.mailSooner;
  const hello = fill(text.mailHello, { name: row.full_name });
  const plain = [
    hello,
    "",
    lead,
    `«${row.event_title}»`,
    fill(text.mailDate, { when }),
    fill(text.mailPlace, { place: row.location }),
    "",
    text.mailAttach,
  ].join("\n");
  const html = renderReminderEmail({
    kicker: text.mailKicker,
    title: row.event_title,
    hello,
    lead,
    dateLabel: text.date,
    date: range.date,
    time: `${range.time} · ${text.astanaTime}`,
    placeLabel: text.place,
    place: row.location,
    note: text.mailAttach,
  });
  return {
    id: row.id,
    to: row.email,
    subject: fill(text.mailSubject, { title: row.event_title }),
    text: plain,
    html,
    ics: buildIcs({
      uid: `reg-${row.id}@events.local`,
      title: row.event_title,
      description: row.summary || row.event_title,
      location: row.location,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      email: row.email,
    }),
  };
}

function renderReminderEmail(input: {
  kicker: string;
  title: string;
  hello: string;
  lead: string;
  dateLabel: string;
  date: string;
  time: string;
  placeLabel: string;
  place: string;
  note: string;
}) {
  const kicker = escapeHtml(input.kicker);
  const title = escapeHtml(input.title);
  const hello = escapeHtml(input.hello);
  const lead = escapeHtml(input.lead);
  const dateLabel = escapeHtml(input.dateLabel);
  const date = escapeHtml(input.date);
  const time = escapeHtml(input.time);
  const placeLabel = escapeHtml(input.placeLabel);
  const place = escapeHtml(input.place);
  const note = escapeHtml(input.note);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f3f3;">
  <div style="display:none;max-height:0;overflow:hidden;">${lead}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-collapse:collapse;">
          <tr>
            <td bgcolor="#07070c" style="background:#07070c;padding:36px 36px 32px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;color:#fc3b20;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${kicker}</p>
              <h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.15;font-weight:700;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 8px;font-family:Arial,Helvetica,sans-serif;color:#141414;font-size:16px;line-height:1.55;">
              <p style="margin:0 0 12px;">${hello}</p>
              <p style="margin:0;">${lead}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 8px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:16px 0;border-top:1px solid #e6e6e6;">
                    <p style="margin:0 0 4px;color:#5e5e5e;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${dateLabel}</p>
                    <p style="margin:0;color:#141414;font-size:18px;font-weight:700;line-height:1.35;">${date}</p>
                    <p style="margin:4px 0 0;color:#5e5e5e;font-size:14px;">${time}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-top:1px solid #e6e6e6;border-bottom:1px solid #e6e6e6;">
                    <p style="margin:0 0 4px;color:#5e5e5e;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${placeLabel}</p>
                    <p style="margin:0;color:#141414;font-size:18px;font-weight:700;line-height:1.35;">${place}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 36px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;background:#f6f6f6;padding:16px 18px;color:#3a3a3a;font-size:14px;line-height:1.55;">${note}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function processReminders() {
  const result = { sent: 0, saved: 0, failed: 0, skipped: 0 };
  if (running) return { ...result, busy: true };
  running = true;
  try {
    const configured = smtpConfig().configured;
    for (const row of listReminderCandidates()) {
      const phase = reminderPhase(row.starts_at);
      if (phase === "wait") continue;
      if (phase === "missed") {
        setReminderStatus(row.id, "skipped", "started");
        result.skipped += 1;
        continue;
      }
      if (!configured && row.reminder_status === "saved") continue;
      if (!row.email) {
        setReminderStatus(row.id, "error", "no-email");
        result.failed += 1;
        continue;
      }
      const delivery = await deliverReminder(messageFor(row));
      if (!delivery.ok) {
        setReminderStatus(row.id, "error", delivery.error);
        result.failed += 1;
      } else if (delivery.mode === "smtp") {
        setReminderStatus(row.id, "sent", null);
        result.sent += 1;
      } else {
        setReminderStatus(row.id, "saved", "saved-local");
        result.saved += 1;
      }
    }
    if (result.sent || result.saved || result.failed || result.skipped) {
      console.log(
        `[reminders] sent=${result.sent} saved=${result.saved} failed=${result.failed} skipped=${result.skipped}`,
      );
    }
    return result;
  } finally {
    running = false;
  }
}
