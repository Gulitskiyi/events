import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventHero } from "@/components/event-hero";
import { Header } from "@/components/header";
import { RegisterForm } from "@/components/register-form";
import { formatRange, isRegistrationOpen } from "@/lib/format";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { getEventBySlug } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  const text = messages[await getLocale()];
  if (!event || !event.published) return { title: text.events };
  return { title: event.title, description: event.summary || event.location };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published) notFound();

  const locale = await getLocale();
  const text = messages[locale];
  const range = formatRange(event.starts_at, event.ends_at, locale);
  const open = isRegistrationOpen(event.starts_at);

  return (
    <>
      <Header />
      <main>
        <EventHero
          eyebrow={text.register}
          title={event.title}
          summary={event.summary}
          date={range.date}
          place={event.location}
          side={
            <div>
              <div className="infobar-time">{range.time}</div>
              <div className="infobar-tz">{text.astanaTime}</div>
            </div>
          }
        />
        <section className="wrap reg-wrap">
          <div>
            <p className="eyebrow">{text.participation}</p>
            <p className="prose">{event.description || text.fallbackAbout}</p>
            <ul className="facts">
              <li>
                <span>{text.when}</span>
                <strong>
                  {range.date}, {range.time}
                </strong>
              </li>
              <li>
                <span>{text.where}</span>
                <strong>{event.location}</strong>
              </li>
            </ul>
            {event.contracts_enabled === 1 ? (
              <p className="contracts-cta">
                <Link className="btn btn-ghost" href={`/e/${event.slug}/contracts`}>
                  {text.contractsOpenBoard}
                </Link>
              </p>
            ) : null}
          </div>
          <div className="reg-form">
            {open ? (
              <RegisterForm
                eventId={event.id}
                title={event.title}
                locale={locale}
                contractsEnabled={event.contracts_enabled === 1}
                eventSlug={event.slug}
              />
            ) : (
              <div className="closed-note">
                <h2>{text.closedTitle}</h2>
                <p>{text.closedText}</p>
                {event.contracts_enabled === 1 ? (
                  <p>
                    <Link href={`/e/${event.slug}/contracts`}>{text.contractsOpenBoard}</Link>
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
