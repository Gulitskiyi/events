"use client";

import { useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

export function ReminderActions({ locale }: { locale: Locale }) {
  const text = messages[locale];
  const [pending, setPending] = useState<"run" | "retry" | null>(null);
  const [message, setMessage] = useState("");

  async function run(action: "run" | "retry") {
    setPending(action);
    setMessage("");
    const response = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      error?: string;
      sent?: number;
      saved?: number;
      failed?: number;
      skipped?: number;
    };
    if (!response.ok || !data.ok) {
      setMessage(data.error || text.errReminders);
      setPending(null);
      return;
    }
    const total = (data.sent || 0) + (data.saved || 0) + (data.failed || 0) + (data.skipped || 0);
    if (total === 0) {
      setMessage(text.nothingToSend);
      setPending(null);
      return;
    }
    const params = new URLSearchParams({
      sent: String(data.sent || 0),
      saved: String(data.saved || 0),
      failed: String(data.failed || 0),
      skipped: String(data.skipped || 0),
    });
    location.search = params.toString();
  }

  return (
    <div className="stack">
      <div className="actions">
        <button className="btn" type="button" disabled={pending !== null} onClick={() => run("run")}>
          {pending === "run" ? text.checking : text.sendDue}
        </button>
        <button className="btn btn-ghost" type="button" disabled={pending !== null} onClick={() => run("retry")}>
          {pending === "retry" ? text.retrying : text.retryFailed}
        </button>
      </div>
      {message ? <p className="note">{message}</p> : null}
    </div>
  );
}
