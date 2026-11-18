export const COUNTRY_IDS = [
  "kz",
  "ru",
  "kg",
  "uz",
  "tj",
  "tm",
  "az",
  "am",
  "ge",
  "by",
  "ua",
  "cn",
  "tr",
  "ae",
  "in",
  "de",
  "gb",
  "us",
  "fr",
  "other",
] as const;

export type CountryId = (typeof COUNTRY_IDS)[number];

export const LEGACY_COUNTRY: Record<string, CountryId> = {
  Казахстан: "kz",
  Россия: "ru",
  Кыргызстан: "kg",
  Узбекистан: "uz",
  Таджикистан: "tj",
  Туркменистан: "tm",
  Азербайджан: "az",
  Армения: "am",
  Грузия: "ge",
  Беларусь: "by",
  Украина: "ua",
  Китай: "cn",
  Турция: "tr",
  ОАЭ: "ae",
  Индия: "in",
  Германия: "de",
  Великобритания: "gb",
  США: "us",
  Франция: "fr",
  Другая: "other",
};

export function isCountryId(value: string): value is CountryId {
  return (COUNTRY_IDS as readonly string[]).includes(value);
}
