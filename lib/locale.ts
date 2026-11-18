export const LOCALES = ["ru", "en", "kk"] as const;
export type Locale = (typeof LOCALES)[number];
export const LANG_COOKIE = "lang";

export function parseLocale(value: string | undefined | null): Locale {
  if (value === "en" || value === "kk" || value === "ru") return value;
  return "ru";
}
