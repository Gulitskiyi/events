import Link from "next/link";
import { EventHero } from "@/components/event-hero";
import { Header } from "@/components/header";
import { ProposalForm } from "@/components/proposal-form";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { getContestEvent, getContestSettings, isProposalsOpen } from "@/lib/store";

export default async function ProposePage() {
  const locale = await getLocale();
  const text = messages[locale];
  const event = getContestEvent();
  const settings = getContestSettings();
  const open = Boolean(event && event.published && event.contracts_enabled === 1 && isProposalsOpen(event));
  const voteHref = event?.contracts_enabled === 1 ? `/e/${event.slug}/contracts` : "/";

  return (
    <>
      <Header voteHref={voteHref} />
      <main>
        <EventHero eyebrow={text.contestEyebrow} title={text.contestCta} summary={text.proposeLead} />
        <div className="reg-wrap">
          <div className="wrap reg-inner">
            <div>
              <p className="eyebrow">{text.refsTitle}</p>
              <h2 className="form-title" style={{ fontSize: 28 }}>
                {text.category}
              </h2>
              <ul className="how-list plain">
                <li>{text.categoryBanks}</li>
                <li>{text.categoryStocks}</li>
                <li>{text.categoryCrypto}</li>
              </ul>
              <div className="refs-side">
                <a className="btn btn-ghost" href={settings.green_list_url} target="_blank" rel="noreferrer">
                  {text.refsGreenBtn}
                </a>
                <a className="btn btn-ghost" href={settings.its_stocks_url} target="_blank" rel="noreferrer">
                  {text.refsStocksBtn}
                </a>
                <Link className="btn btn-ghost" href="/#how">
                  {text.navHow}
                </Link>
              </div>
            </div>
            {event ? (
              <ProposalForm eventId={event.id} locale={locale} open={open} />
            ) : (
              <div className="closed-note">
                <h2>{text.errNoContest}</h2>
                <p>{text.noEvents}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
