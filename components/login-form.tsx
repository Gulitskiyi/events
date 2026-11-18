"use client";

import { FormEvent, useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

export function LoginForm({ configured, locale }: { configured: boolean; locale: Locale }) {
  const text = messages[locale];
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const password = String(new FormData(event.currentTarget).get("password") || "");
    setPending(true);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error || text.errLogin);
      setPending(false);
      return;
    }
    location.href = "/admin";
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <p className="eyebrow">{text.adminEyebrow}</p>
      <h1>{text.loginTitle}</h1>
      <p>{text.loginText}</p>
      {!configured ? <p className="form-error">{text.loginMissing}</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="password">{text.password}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" disabled={!configured} />
      </div>
      <button className="btn btn-block" type="submit" disabled={!configured || pending}>
        {pending ? text.signingIn : text.signIn}
      </button>
    </form>
  );
}
