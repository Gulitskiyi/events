import Link from "next/link";
import { EventHero } from "@/components/event-hero";
import { Header } from "@/components/header";
import { formatRange, isRegistrationOpen } from "@/lib/format";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { listPublicEvents } from "@/lib/store";

export default async function HomePage() {
  const locale = await getLocale();
  const text = messages[locale];
  const events = listPublicEvents();
  const upcoming = events.filter((event) => isRegistrationOpen(event.starts_at));
  const past = events.filter((event) => !isRegistrationOpen(event.starts_at)).reverse();
  const featured = upcoming[0];
  const rest = upcoming.slice(1);
  const featuredRange = featured ? formatRange(featured.starts_at, featured.ends_at, locale) : null;

  return (
    <>
      <Header />
      <main>
        {featured && featuredRange ? (
          <EventHero
            eyebrow={text.upcoming}
            title={featured.title}
            summary={featured.summary}
            date={featuredRange.date}
            place={featured.location}
            side={
              <Link className="btn" href={`/e/${featured.slug}`}>
                {text.register}
              </Link>
            }
          />
        ) : (
          <EventHero eyebrow={text.register} title={text.events} summary={text.noEvents} />
        )}

        {featured && featuredRange ? (
          <section className="wrap points">
            <div>
              <span>{text.date}</span>
              <strong>{featuredRange.date}</strong>
            </div>
            <div>
              <span>{text.place}</span>
              <strong>{featured.location}</strong>
            </div>
          </section>
        ) : null}

        {rest.length > 0 || past.length > 0 ? (
          <section className="wrap section">
            {rest.length > 0 ? (
              <>
                <h2 className="section-title">{text.otherEvents}</h2>
                {rest.map((event) => {
                  const range = formatRange(event.starts_at, event.ends_at, locale);
                  return (
                    <Link className="event-row" href={`/e/${event.slug}`} key={event.id}>
                      <div>
                        <div className="event-row-date">{range.date}</div>
                        <div className="muted">{range.time}</div>
                      </div>
                      <div>
                        <div className="event-row-title">{event.title}</div>
                        <div className="muted">{event.location}</div>
                      </div>
                      <span className="btn">{text.register}</span>
                    </Link>
                  );
                })}
              </>
            ) : null}
            {past.length > 0 ? (
              <>
                <h2 className="section-title">{text.past}</h2>
                {past.map((event) => {
                  const range = formatRange(event.starts_at, event.ends_at, locale);
                  return (
                    <Link className="event-row" href={`/e/${event.slug}`} key={event.id}>
                      <div>
                        <div className="event-row-date">{range.date}</div>
                        <div className="muted">{range.time}</div>
                      </div>
                      <div>
                        <div className="event-row-title">{event.title}</div>
                        <div className="muted">{event.location}</div>
                      </div>
                      <span className="btn btn-ghost">{text.details}</span>
                    </Link>
                  );
                })}
              </>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
