"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/locale";
import { COUNTRY_LIST, fill, messages } from "@/lib/messages";

export function RegisterForm({
  eventId,
  title,
  locale,
  contractsEnabled = false,
  eventSlug,
}: {
  eventId: string;
  title: string;
  locale: Locale;
  contractsEnabled?: boolean;
  eventSlug?: string;
}) {
  const text = messages[locale];
  const [remind, setRemind] = useState(false);
  const [consent, setConsent] = useState(false);
  const [otherCountry, setOtherCountry] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; email: string; timing: string; proposed: boolean } | null>(
    null,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "").trim();
    const company = String(form.get("company") || "").trim();
    const country = String(form.get("country") || "").trim();
    const countryOther = String(form.get("countryOther") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const position = String(form.get("position") || "").trim();
    const email = String(form.get("email") || "").trim();
    const website = String(form.get("website") || "");
    const contractProposal = String(form.get("contractProposal") || "").trim();

    if (fullName.length < 3) return setError(text.errName);
    if (company.length < 2) return setError(text.errCompany);
    if (!country || (country === "other" && countryOther.length < 2)) return setError(text.errCountry);
    if (phone.replace(/\D/g, "").length < 10) return setError(text.errPhone);
    if (position.length < 2) return setError(text.errPosition);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(text.errEmail);
    if (!consent) return setError(text.errConsent);
    if (contractsEnabled && contractProposal.length > 500) return setError(text.errContractLong);

    setPending(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fullName,
          company,
          country,
          countryOther,
          phone,
          position,
          email,
          remind,
          consent,
          website,
          contractProposal: contractsEnabled ? contractProposal : "",
          lang: locale,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; timing?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errSubmit);
        setPending(false);
        return;
      }
      setDone({
        name: fullName,
        email,
        timing: data.timing || "none",
        proposed: Boolean(contractsEnabled && contractProposal),
      });
    } catch {
      setError(text.errNetwork);
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="success">
        <p className="eyebrow">{text.doneEyebrow}</p>
        <h2>{text.doneTitle}</h2>
        <p>{fill(text.doneBody, { name: done.name, title })}</p>
        {done.timing === "later" ? <p>{fill(text.doneLater, { email: done.email })}</p> : null}
        {done.timing === "soon" ? <p>{fill(text.doneSoon, { email: done.email })}</p> : null}
        {done.proposed && eventSlug ? (
          <p>
            <Link href={`/e/${eventSlug}/contracts`}>{text.contractsGoBoard}</Link>
          </p>
        ) : null}
        <p>
          <Link href="/">{text.toList}</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="form-title">{text.formTitle}</h2>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="hp" aria-hidden="true">
        <label>
          {text.honeypot}
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="field">
        <label htmlFor="fullName">
          {text.fullName} <span className="req">*</span>
        </label>
        <input id="fullName" name="fullName" autoComplete="name" placeholder={text.fullNamePh} />
      </div>
      <div className="field">
        <label htmlFor="company">
          {text.company} <span className="req">*</span>
        </label>
        <input id="company" name="company" autoComplete="organization" placeholder={text.companyPh} />
      </div>
      <div className="field">
        <label htmlFor="country">
          {text.country} <span className="req">*</span>
        </label>
        <select
          id="country"
          name="country"
          defaultValue="kz"
          onChange={(event) => setOtherCountry(event.target.value === "other")}
        >
          {COUNTRY_LIST.map((code) => (
            <option key={code} value={code}>
              {text.countries[code]}
            </option>
          ))}
        </select>
      </div>
      {otherCountry ? (
        <div className="field">
          <label htmlFor="countryOther">
            {text.countryOther} <span className="req">*</span>
          </label>
          <input id="countryOther" name="countryOther" autoComplete="country-name" />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="phone">
          {text.phone} <span className="req">*</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+7 777 000 00 00" />
      </div>
      <div className="field">
        <label htmlFor="position">
          {text.position} <span className="req">*</span>
        </label>
        <input id="position" name="position" autoComplete="organization-title" placeholder={text.positionPh} />
      </div>
      <div className="field">
        <label htmlFor="email">
          {text.email} <span className="req">*</span>
        </label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" />
      </div>
      {contractsEnabled ? (
        <div className="field">
          <label htmlFor="contractProposal">{text.contractField}</label>
          <textarea
            id="contractProposal"
            name="contractProposal"
            rows={3}
            maxLength={500}
            placeholder={text.contractFieldPh}
          />
          <p className="hint">{text.contractFieldHint}</p>
        </div>
      ) : null}
      <label className="check">
        <input type="checkbox" checked={remind} onChange={(event) => setRemind(event.target.checked)} />
        <span>{text.remind}</span>
      </label>
      {remind ? <p className="hint">{text.remindHint}</p> : null}
      <Link className="btn btn-ghost btn-block consent-link" href="/policy">
        {text.consentButton}
      </Link>
      <div className="check">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          {text.consentBefore}
          <Link href="/policy#personal">{text.consentPersonal}</Link>
          {text.consentAnd}
          <Link href="/policy#privacy">{text.consentPrivacy}</Link>
          {text.consentAfter}
        </span>
      </div>
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? text.sending : text.submit}
      </button>
    </form>
  );
}
