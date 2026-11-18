import Link from "next/link";
import { ReminderActions } from "@/components/reminder-actions";
import { formatDateTime } from "@/lib/format";
import { reminderLabel } from "@/lib/labels";
import { getLocale } from "@/lib/current-locale";
import { smtpConfig } from "@/lib/mail";
import { fill, messages } from "@/lib/messages";
import { listEvents, listRecentRegistrations, stats } from "@/lib/store";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const text = messages[locale];
  const events = listEvents();
  const recent = listRecentRegistrations();
  const totals = stats();
  const mail = smtpConfig();
  const report = ["sent", "saved", "failed", "skipped"].some((key) => typeof params[key] === "string");

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{text.adminEvents}</h1>
          <p className="lede">{text.adminLead}</p>
        </div>
        <Link className="btn" href="/admin/events/new">
          {text.newEvent}
        </Link>
      </div>

      <div className={mail.configured ? "banner ok" : "banner"}>{mail.configured ? text.mailOn : text.mailOff}</div>
      {report ? (
        <div className="banner ok">
          {fill(text.report, {
            sent: String(params.sent || 0),
            saved: String(params.saved || 0),
            failed: String(params.failed || 0),
            skipped: String(params.skipped || 0),
          })}
        </div>
      ) : null}

      <div className="stats">
        <div className="stat">
          <span>{text.statEvents}</span>
          <strong>{totals.events}</strong>
        </div>
        <div className="stat">
          <span>{text.statRegs}</span>
          <strong>{totals.registrations}</strong>
        </div>
        <div className="stat">
          <span>{text.statPending}</span>
          <strong>{totals.pending}</strong>
        </div>
      </div>

      <div className="panel">
        <ReminderActions locale={locale} />
      </div>

      {events.length === 0 ? (
        <p className="empty">{text.emptyEvents}</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>{text.colEvent}</th>
                <th>{text.colDate}</th>
                <th>{text.colPlace}</th>
                <th>{text.colRegs}</th>
                <th>{text.colStatus}</th>
                <th>{text.colLink}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link className="linkish" href={`/admin/events/${event.id}`}>
                      {event.title}
                    </Link>
                  </td>
                  <td>{formatDateTime(event.starts_at, locale)}</td>
                  <td>{event.location}</td>
                  <td>{event.registration_count}</td>
                  <td>
                    <span className={event.published ? "badge badge-on" : "badge"}>
                      {event.published ? text.statusOpen : text.statusHidden}
                    </span>
                  </td>
                  <td className="path">/e/{event.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recent.length > 0 ? (
        <section className="panel" style={{ marginTop: 22 }}>
          <h2>{text.recent}</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{text.colEvent}</th>
                  <th>{text.colName}</th>
                  <th>{text.colCompany}</th>
                  <th>{text.colPhone}</th>
                  <th>{text.colReminder}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="linkish" href={`/admin/events/${row.event_id}`}>
                        {row.event_title}
                      </Link>
                    </td>
                    <td>{row.full_name}</td>
                    <td>{row.company}</td>
                    <td>{row.phone}</td>
                    <td>{reminderLabel(row, row.starts_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
