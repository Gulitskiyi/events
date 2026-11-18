"use client";

import { useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

export function CopyLink({
  path,
  locale,
  origin,
}: {
  path: string;
  locale: Locale;
  origin?: string;
}) {
  const text = messages[locale];
  const [done, setDone] = useState(false);

  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={async () => {
        const base = (origin || location.origin).replace(/\/$/, "");
        await navigator.clipboard.writeText(`${base}${path}`);
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? text.copied : text.copyLink}
    </button>
  );
}
