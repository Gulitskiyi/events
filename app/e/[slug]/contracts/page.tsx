import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractsBoard } from "@/components/contracts-board";
import { EventHero } from "@/components/event-hero";
import { Header } from "@/components/header";
import { formatRange } from "@/lib/format";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { countContractProposals, getEventBySlug } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  const text = messages[await getLocale()];
  if (!event || !event.published || event.contracts_enabled !== 1) return { title: text.contractsTitle };
  return { title: `${text.contractsTitle} — ${event.title}`, description: event.summary || event.location };
}

export default async function ContractsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published || event.contracts_enabled !== 1) notFound();

  const locale = await getLocale();
  const text = messages[locale];
  const range = formatRange(event.starts_at, event.ends_at, locale);
  const count = countContractProposals(event.id);

  return (
    <>
      <Header voteHref={`/e/${event.slug}/contracts`} />
      <main>
        <EventHero
          eyebrow={text.contractsTitle}
          title={event.title}
          summary={text.contractsLead}
          date={range.date}
          place={event.location}
          side={
            <div>
              <div className="infobar-time">{count}</div>
              <div className="infobar-tz">{text.contractsTotal}</div>
            </div>
          }
        />
        <section className="section contracts-section">
          <div className="wrap">
            <div className="contracts-head">
              <div>
                <h2 className="section-title">{text.contractsBoard}</h2>
                <p className="lede">{text.contractsLiveHint}</p>
              </div>
              <Link className="btn btn-ghost" href="/propose">
                {text.contestCta}
              </Link>
            </div>
            <ContractsBoard slug={event.slug} locale={locale} votingOpen={event.contracts_voting === 1} />
          </div>
        </section>
      </main>
    </>
  );
}
