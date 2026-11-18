"use client";

import { LANG_COOKIE, LOCALES, type Locale } from "@/lib/locale";

const LABEL: Record<Locale, string> = { ru: "РУ", en: "EN", kk: "ҚА" };

export function LangSwitch({ locale }: { locale: Locale }) {
  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LANG_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    location.reload();
  }

  return (
    <div className="langs" role="group" aria-label="Language">
      {LOCALES.map((code) => (
        <button key={code} type="button" aria-pressed={code === locale} onClick={() => choose(code)}>
          {LABEL[code]}
        </button>
      ))}
    </div>
  );
}
