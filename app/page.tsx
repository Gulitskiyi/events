import Link from "next/link";
import { EventHero } from "@/components/event-hero";
import { Header } from "@/components/header";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { getContestEvent, getContestSettings, isProposalsOpen } from "@/lib/store";

export default async function HomePage() {
  const locale = await getLocale();
  const text = messages[locale];
  const event = getContestEvent();
  const settings = getContestSettings();
  const open = event ? isProposalsOpen(event) && event.contracts_enabled === 1 : false;
  const voteHref = event?.contracts_enabled === 1 ? `/e/${event.slug}/contracts` : "/propose";

  return (
    <>
      <Header voteHref={voteHref} variant="overlay" />
      <main>
        <EventHero
          banner
          eyebrow={text.contestEyebrow}
          title={text.contestTitle}
          summary={text.contestLead}
          side={
            open ? (
              <Link className="btn" href="/propose">
                {text.contestCta}
              </Link>
            ) : (
              <Link className="btn btn-ghost" href={voteHref}>
                {text.navVote}
              </Link>
            )
          }
        />

        <section className="points contest-points">
          <div className="wrap points-inner">
            <div>
              <span>{text.contestEventName}</span>
              <strong>YES OR NO?</strong>
            </div>
            <div>
              <span>{text.settlement}</span>
              <strong>{text.settlementFixed}</strong>
            </div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="wrap">
            <h2 className="section-title">{text.howTitle}</h2>
            <ol className="how-list">
              <li>{text.howStep1}</li>
              <li>{text.howStep2}</li>
              <li>{text.howStep3}</li>
              <li>{text.howStep4}</li>
              <li>{text.howStep5}</li>
            </ol>
            {open ? (
              <div className="contracts-cta">
                <Link className="btn" href="/propose">
                  {text.contestCta}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="section" id="refs">
          <div className="wrap">
            <h2 className="section-title">{text.refsTitle}</h2>
            <div className="refs-grid">
              <article>
                <h3>{text.refsGreenTitle}</h3>
                <p className="muted">{text.refsGreenText}</p>
                <a className="btn btn-ghost" href={settings.green_list_url} target="_blank" rel="noreferrer">
                  {text.refsGreenBtn}
                </a>
              </article>
              <article>
                <h3>{text.refsStocksTitle}</h3>
                <p className="muted">{text.refsStocksText}</p>
                <a className="btn btn-ghost" href={settings.its_stocks_url} target="_blank" rel="noreferrer">
                  {text.refsStocksBtn}
                </a>
              </article>
              <article>
                <h3>{text.refsBanksTitle}</h3>
                <p className="muted">{text.refsBanksText}</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
