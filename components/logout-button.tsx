"use client";

import { useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

export function LogoutButton({ locale }: { locale: Locale }) {
  const text = messages[locale];
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/admin/logout", { method: "POST" });
        location.href = "/admin/login";
      }}
    >
      {text.logout}
    </button>
  );
}
