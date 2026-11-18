import { notFound } from "next/navigation";
import { CopyLink } from "@/components/copy-link";
import { EventForm } from "@/components/event-form";
import { RegistrationTable } from "@/components/registration-table";
import { ReminderActions } from "@/components/reminder-actions";
import { formatDateTime, toAlmatyInput } from "@/lib/format";
import { reminderLabel } from "@/lib/labels";
import { getLocale } from "@/lib/current-locale";
import { countryLabel, fill, messages } from "@/lib/messages";
import { publicOrigin, publicUrl } from "@/lib/origins";
import { getEventById, listRegistrations } from "@/lib/store";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const locale = await getLocale();
  const text = messages[locale];
  const event = getEventById(id);
  if (!event) notFound();
  const rows = listRegistrations(event.id);
  const report = ["sent", "saved", "failed", "skipped"].some((key) => typeof query[key] === "string");
  const site = publicOrigin();
  const eventPath = `/e/${event.slug}`;
  const contractsPath = `/e/${event.slug}/contracts`;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{event.title}</h1>
          <p className="lede">
            <a href={publicUrl(eventPath)}>{text.openPage}</a>
            {" · "}
            <span className="path">{eventPath}</span>
          </p>
        </div>
        <CopyLink path={eventPath} locale={locale} origin={site} />
      </div>
      {report ? (
        <div className="banner ok">
          {fill(text.report, {
            sent: String(query.sent || 0),
            saved: String(query.saved || 0),
            failed: String(query.failed || 0),
            skipped: String(query.skipped || 0),
          })}
        </div>
      ) : null}
      <EventForm
        mode="edit"
        locale={locale}
        id={event.id}
        initial={{
          title: event.title,
          summary: event.summary,
          description: event.description,
          location: event.location,
          startsAt: toAlmatyInput(event.starts_at),
          endsAt: event.ends_at ? toAlmatyInput(event.ends_at) : "",
          slug: event.slug,
          published: event.published === 1,
          contractsEnabled: event.contracts_enabled === 1,
          contractsVoting: event.contracts_voting === 1,
        }}
      />
      {event.contracts_enabled === 1 ? (
        <section className="panel">
          <div className="row-between">
            <h2>{text.contractsAdminTitle}</h2>
            <a className="btn btn-ghost" href={publicUrl(contractsPath)}>
              {text.contractsOpenBoard}
            </a>
          </div>
          <p className="note">
            {event.contracts_voting === 1 ? text.contractsVotingOn : text.contractsVotingOff}
          </p>
        </section>
      ) : null}
      <section className="panel">
        <div className="row-between">
          <h2>{fill(text.regsCount, { count: rows.length })}</h2>
          <a className="btn btn-ghost" href={`/api/admin/export/${event.id}`}>
            {text.downloadCsv}
          </a>
        </div>
        <ReminderActions locale={locale} />
        <div style={{ height: 16 }} />
        <RegistrationTable
          rows={rows.map((row) => ({
            id: row.id,
            fullName: row.full_name,
            company: row.company,
            country: countryLabel(locale, row.country),
            phone: row.phone,
            position: row.position,
            email: row.email,
            reminder: reminderLabel(row, event.starts_at, locale),
            created: formatDateTime(row.created_at, locale),
          }))}
          locale={locale}
        />
      </section>
    </>
  );
}
