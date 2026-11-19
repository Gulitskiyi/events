import Image from "next/image";
import type { ReactNode } from "react";

export function EventHero({
  eyebrow,
  title,
  summary,
  date,
  place,
  side,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  date?: string;
  place?: string;
  side?: ReactNode;
}) {
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
        {date ? (
          <div className="infobar">
            <div className="wrap infobar-inner">
              <div>
                <div className="infobar-date">{date}</div>
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
