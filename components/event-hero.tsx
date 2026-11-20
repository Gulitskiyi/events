import Image from "next/image";
import type { ReactNode } from "react";

export function EventHero({
  eyebrow,
  title,
  summary,
  date,
  place,
  side,
  banner = false,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  date?: string;
  place?: string;
  side?: ReactNode;
  banner?: boolean;
}) {
  if (!banner) {
    return (
      <section className="page-head">
        <div className="wrap page-head-inner">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {summary ? <p className="page-head-summary">{summary}</p> : null}
            {date ? (
              <p className="page-head-meta">
                {date}
                {place ? ` · ${place}` : ""}
              </p>
            ) : null}
          </div>
          {side ? <div className="page-head-side">{side}</div> : null}
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="hero-media">
        <Image
          src="/astana.jpg"
          alt={title}
          width={1920}
          height={1080}
          priority
          sizes="100vw"
          quality={92}
          className="hero-banner"
        />
      </div>
      <section className="hero-below">
        <div className="wrap hero-inner">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {summary ? <p className="hero-summary">{summary}</p> : null}
        </div>
        {date || side ? (
          <div className="infobar">
            <div className="wrap infobar-inner">
              <div>
                {date ? <div className="infobar-date">{date}</div> : null}
                {place ? <div className="infobar-place">{place}</div> : null}
              </div>
              {side ? <div>{side}</div> : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
