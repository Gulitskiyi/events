import type { Metadata } from "next";
import { Header } from "@/components/header";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import policyText from "@/lib/policy-text.json";

type Section = { n: string; text: string };

const documents = policyText as Record<"ru" | "en", { privacy: Section[]; personal: Section[] }>;

export async function generateMetadata(): Promise<Metadata> {
  const text = messages[await getLocale()];
  return { title: text.consentButton };
}

function Article({ id, title, sections }: { id: string; title: string; sections: Section[] }) {
  return (
    <article id={id} className="policy-doc">
      <h2>{title}</h2>
      {sections.map((section) => (
        <p key={`${id}-${section.n}`}>
          <strong>{section.n}.</strong> {section.text}
        </p>
      ))}
    </article>
  );
}

export default async function PolicyPage() {
  const locale = await getLocale();
  const text = messages[locale];
  const source: "ru" | "en" = locale === "en" ? "en" : "ru";
  const docs = documents[source];

  return (
    <>
      <div className="policy-top">
        <Header />
      </div>
      <main className="wrap policy">
        <h1>{text.consentButton}</h1>
        {locale === "kk" ? <p className="policy-note">{text.policyKkNote}</p> : null}
        <Article id="personal" title={text.policyPersonalTitle} sections={docs.personal} />
        <Article id="privacy" title={text.policyPrivacyTitle} sections={docs.privacy} />
      </main>
    </>
  );
}
