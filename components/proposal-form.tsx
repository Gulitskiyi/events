"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContestCategory, ConditionOp } from "@/lib/contest";
import type { Locale } from "@/lib/locale";
import { fill, messages } from "@/lib/messages";

type Asset = { code: string; title: string; search: string };

export function ProposalForm({
  eventId,
  locale,
  open,
}: {
  eventId: string;
  locale: Locale;
  open: boolean;
}) {
  const text = messages[locale];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ number: number } | null>(null);
  const [consent, setConsent] = useState(false);
  const [rules, setRules] = useState(false);
  const [category, setCategory] = useState<ContestCategory | "">("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetQuery, setAssetQuery] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [conditionOp, setConditionOp] = useState<ConditionOp | "">("");

  useEffect(() => {
    if (!category) {
      setAssets([]);
      setAssetCode("");
      return;
    }
    let cancelled = false;
    void fetch(`/api/directories?category=${category}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; items?: Asset[] }) => {
        if (cancelled || !data.ok || !data.items) return;
        setAssets(data.items);
        setAssetCode("");
        setAssetQuery("");
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const filtered = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.search.toLowerCase().includes(q),
    );
  }, [assetQuery, assets]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!open) return setError(text.errDeadline);
    setError("");
    const form = new FormData(event.currentTarget);
    const lastName = String(form.get("lastName") || "").trim();
    const firstName = String(form.get("firstName") || "").trim();
    const company = String(form.get("company") || "").trim();
    const position = String(form.get("position") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const title = String(form.get("title") || "").trim();
    const eventQuestion = String(form.get("eventQuestion") || "").trim();
    const conditionValue = String(form.get("conditionValue") || "").trim();
    const comment = String(form.get("comment") || "").trim();
    const website = String(form.get("website") || "");
    const selected = assets.find((item) => item.code === assetCode);

    if (lastName.length < 2) return setError(text.errLastName);
    if (firstName.length < 2) return setError(text.errFirstName);
    if (company.length < 2) return setError(text.errCompany);
    if (position.length < 2) return setError(text.errPosition);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(text.errEmail);
    if (phone.replace(/\D/g, "").length < 10) return setError(text.errPhone);
    if (title.length < 2) return setError(text.errContractTitle);
    if (!category) return setError(text.errCategory);
    if (!selected) return setError(text.errAsset);
    if (eventQuestion.length < 8) return setError(text.errQuestion);
    if (!conditionOp || !conditionValue || Number.isNaN(Number(conditionValue.replace(",", ".")))) {
      return setError(text.errCondition);
    }
    if (!rules) return setError(text.errRules);
    if (!consent) return setError(text.errConsent);

    setPending(true);
    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          lastName,
          firstName,
          company,
          position,
          email,
          phone,
          title,
          category,
          assetCode: selected.code,
          assetLabel: `${selected.code} — ${selected.title}`,
          eventQuestion,
          conditionOp,
          conditionValue: conditionValue.replace(",", "."),
          comment,
          rules,
          consent,
          website,
          lang: locale,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; number?: number };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errSubmit);
        setPending(false);
        return;
      }
      setDone({ number: data.number || 0 });
    } catch {
      setError(text.errNetwork);
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div className="closed-note">
        <h2>{text.errDeadline}</h2>
      </div>
    );
  }

  if (done) {
    return (
      <div className="success">
        <p className="eyebrow">{text.proposeDoneEyebrow}</p>
        <h2>{text.proposeDoneTitle}</h2>
        <p>{text.proposeDoneBody}</p>
        <p>{text.proposeDoneMeet}</p>
        {done.number ? <p>{fill(text.proposeDoneNumber, { number: done.number })}</p> : null}
        <div className="actions" style={{ marginTop: 20 }}>
          <button className="btn" type="button" onClick={() => location.reload()}>
            {text.proposeAnother}
          </button>
          <Link className="btn btn-ghost" href="/">
            {text.toEvents}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="reg-form" onSubmit={onSubmit}>
      <h2 className="form-title">{text.proposeTitle}</h2>
      <p className="hint" style={{ marginTop: -12 }}>
        {text.proposeLead}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="lastName">
            {text.lastName} <span className="req">*</span>
          </label>
          <input id="lastName" name="lastName" required autoComplete="family-name" />
        </div>
        <div className="field">
          <label htmlFor="firstName">
            {text.firstName} <span className="req">*</span>
          </label>
          <input id="firstName" name="firstName" required autoComplete="given-name" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="company">
          {text.company} <span className="req">*</span>
        </label>
        <input id="company" name="company" required autoComplete="organization" placeholder={text.companyPh} />
      </div>
      <div className="field">
        <label htmlFor="position">
          {text.position} <span className="req">*</span>
        </label>
        <input id="position" name="position" required placeholder={text.positionPh} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="email">
            {text.email} <span className="req">*</span>
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="phone">
            {text.phone} <span className="req">*</span>
          </label>
          <input id="phone" name="phone" type="tel" required autoComplete="tel" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="title">
          {text.contractName} <span className="req">*</span>
        </label>
        <input id="title" name="title" required placeholder={text.contractNamePh} />
      </div>
      <div className="field">
        <label htmlFor="category">
          {text.category} <span className="req">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value as ContestCategory | "")}
          required
        >
          <option value="">—</option>
          <option value="central_banks">{text.categoryBanks}</option>
          <option value="its_stocks">{text.categoryStocks}</option>
          <option value="crypto_green">{text.categoryCrypto}</option>
        </select>
      </div>
      {category ? (
        <div className="field">
          <label htmlFor="assetSearch">
            {text.asset} <span className="req">*</span>
          </label>
          <input
            id="assetSearch"
            value={assetQuery}
            onChange={(event) => setAssetQuery(event.target.value)}
            placeholder={text.assetSearch}
          />
          <select
            className="asset-select"
            value={assetCode}
            onChange={(event) => setAssetCode(event.target.value)}
            required
            size={Math.min(6, Math.max(3, filtered.length || 3))}
          >
            <option value="">—</option>
            {filtered.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="eventQuestion">
          {text.eventQuestion} <span className="req">*</span>
        </label>
        <textarea id="eventQuestion" name="eventQuestion" required placeholder={text.eventQuestionPh} />
      </div>
      <div className="grid-2 condition-row">
        <div className="field">
          <label htmlFor="conditionOp">
            {text.condition} <span className="req">*</span>
          </label>
          <select
            id="conditionOp"
            value={conditionOp}
            onChange={(event) => setConditionOp(event.target.value as ConditionOp | "")}
            required
          >
            <option value="">—</option>
            <option value="above">{text.opAbove}</option>
            <option value="below">{text.opBelow}</option>
            <option value="equal">{text.opEqual}</option>
            <option value="at_or_above">{text.opAtOrAbove}</option>
            <option value="at_or_below">{text.opAtOrBelow}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="conditionValue">
            {text.conditionValue} <span className="req">*</span>
          </label>
          <input id="conditionValue" name="conditionValue" inputMode="decimal" required />
        </div>
      </div>
      <div className="field">
        <label>{text.settlement}</label>
        <input value={text.settlementFixed} disabled readOnly />
        <p className="note">{text.settlementNote}</p>
      </div>
      <div className="field">
        <label htmlFor="comment">{text.comment}</label>
        <textarea id="comment" name="comment" placeholder={text.commentPh} />
        <p className="note">{text.commentHint}</p>
      </div>

      <label className="check">
        <input type="checkbox" checked={rules} onChange={(event) => setRules(event.target.checked)} />
        <span>{text.rulesConsent}</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          {text.consentBefore}
          <Link href="/policy">{text.consentPersonal}</Link>
          {text.consentAnd}
          <Link href="/policy">{text.consentPrivacy}</Link>
          {text.consentAfter}
        </span>
      </label>
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">{text.honeypot}</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? text.sending : text.proposeSubmit}
      </button>
    </form>
  );
}
