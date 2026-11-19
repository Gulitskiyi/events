import Link from "next/link";
import { ProposalsAdmin } from "@/components/proposals-admin";
import { getLocale } from "@/lib/current-locale";
import { formatDateTime } from "@/lib/format";
import { messages } from "@/lib/messages";
import { getEventById, listAllProposals, listEvents } from "@/lib/store";
import type { ProposalStatus } from "@/lib/contest";

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const text = messages[locale];
  const events = listEvents().filter((event) => event.contracts_enabled === 1);
  const eventId = typeof params.event === "string" ? params.event : events[0]?.id;
  const event = eventId ? getEventById(eventId) : null;
  const rows = event
    ? listAllProposals(event.id).map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        category: row.category,
        assetLabel: row.asset_label,
        eventQuestion: row.event_question,
        status: row.status as ProposalStatus,
        votes: row.votes,
        author: `${row.last_name} ${row.first_name}`.trim() || "—",
        company: row.company,
        created: formatDateTime(row.created_at, locale),
      }))
    : [];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{text.adminProposals}</h1>
          <p className="lede">{text.adminProposalLead}</p>
        </div>
        {event ? (
          <a className="btn btn-ghost" href={`/api/admin/export/proposals/${event.id}`}>
            {text.downloadExcel}
          </a>
        ) : null}
      </div>

      {events.length > 1 ? (
        <div className="actions" style={{ marginBottom: 18 }}>
          {events.map((item) => (
            <Link
              key={item.id}
              className={item.id === event?.id ? "btn" : "btn btn-ghost"}
              href={`/admin/proposals?event=${item.id}`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      ) : null}

      {!event ? <p className="empty">{text.emptyEvents}</p> : <ProposalsAdmin rows={rows} locale={locale} />}
    </>
  );
}
