"use client";

import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";
import { slugify } from "@/lib/slug";

export type EventFormInitial = {
  title: string;
  summary: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  slug: string;
  published: boolean;
  contractsEnabled: boolean;
  contractsVoting: boolean;
  proposalsDeadline: string;
};

const EMPTY: EventFormInitial = {
  title: "",
  summary: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
  slug: "",
  published: true,
  contractsEnabled: false,
  contractsVoting: false,
  proposalsDeadline: "",
};

export function EventForm({
  mode,
  id,
  initial,
  locale,
}: {
  mode: "create" | "edit";
  id?: string;
  initial?: EventFormInitial;
  locale: Locale;
}) {
  const text = messages[locale];
  const start = initial || EMPTY;
  const [title, setTitle] = useState(start.title);
  const [slug, setSlug] = useState(start.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [published, setPublished] = useState(start.published);
  const [contractsEnabled, setContractsEnabled] = useState(start.contractsEnabled);
  const [contractsVoting, setContractsVoting] = useState(start.contractsVoting);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    setPending(true);
    const response = await fetch(mode === "create" ? "/api/admin/events" : `/api/admin/events/${id}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary: form.get("summary"),
        description: form.get("description"),
        location: form.get("location"),
        startsAt: form.get("startsAt"),
        endsAt: form.get("endsAt"),
        slug,
        published,
        contractsEnabled,
        contractsVoting,
        proposalsDeadline: form.get("proposalsDeadline"),
      }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string; id?: string };
    if (!response.ok || !data.ok) {
      setError(data.error || text.errSave);
      setPending(false);
      return;
    }
    if (mode === "create" && data.id) {
      location.href = `/admin/events/${data.id}`;
      return;
    }
    setSaved(true);
    setPending(false);
  }

  async function onDelete() {
    if (!id || !confirm(text.confirmDelete)) return;
    const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(text.errDelete);
      return;
    }
    location.href = "/admin";
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <h2>{mode === "create" ? text.newEvent : text.cardTitle}</h2>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="note">{text.saved}</p> : null}
      <div className="field">
        <label htmlFor="title">{text.fieldTitle}</label>
        <input
          id="title"
          value={title}
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="summary">{text.fieldSummary}</label>
        <input id="summary" name="summary" defaultValue={start.summary} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="startsAt">{text.fieldStart}</label>
          <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={start.startsAt} required />
          <p className="note">{text.startNote}</p>
        </div>
        <div className="field">
          <label htmlFor="endsAt">{text.fieldEnd}</label>
          <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={start.endsAt} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="location">{text.fieldLocation}</label>
        <input id="location" name="location" defaultValue={start.location} placeholder={text.locationPh} />
      </div>
      <div className="field">
        <label htmlFor="description">{text.fieldDescription}</label>
        <textarea id="description" name="description" defaultValue={start.description} />
      </div>
      <div className="field">
        <label htmlFor="slug">{text.fieldSlug}</label>
        <input
          id="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value.toLowerCase());
          }}
        />
        <p className="note">
          {text.slugNote} <span className="path">/e/{slug || "…"}</span>
        </p>
      </div>
      <label className="check">
        <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
        <span>{text.published}</span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={contractsEnabled}
          onChange={(event) => {
            const on = event.target.checked;
            setContractsEnabled(on);
            if (!on) setContractsVoting(false);
          }}
        />
        <span>{text.contractsEnabled}</span>
      </label>
      {contractsEnabled ? (
        <>
          <p className="note">{text.contractsEnabledNote}</p>
          <label className="check">
            <input
              type="checkbox"
              checked={contractsVoting}
              onChange={(event) => setContractsVoting(event.target.checked)}
            />
            <span>{text.contractsVoting}</span>
          </label>
          <p className="note">
            {text.contractsPageNote} <span className="path">/e/{slug || "…"}/contracts</span>
          </p>
          <div className="field">
            <label htmlFor="proposalsDeadline">{text.proposalsDeadline}</label>
            <input
              id="proposalsDeadline"
              name="proposalsDeadline"
              type="datetime-local"
              defaultValue={start.proposalsDeadline}
            />
            <p className="note">{text.proposalsDeadlineNote}</p>
          </div>
        </>
      ) : null}
      <div className="actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? text.saving : mode === "create" ? text.create : text.save}
        </button>
        {mode === "edit" ? (
          <button className="btn btn-danger" type="button" onClick={onDelete}>
            {text.delete}
          </button>
        ) : null}
      </div>
    </form>
  );
}
