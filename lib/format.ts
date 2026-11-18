import type { Locale } from "./locale";

export const TZ = "Asia/Almaty";

const INTL: Record<Locale, string> = { ru: "ru-RU", en: "en-GB", kk: "kk-KZ" };

type Parts = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  key: string;
};

function parts(iso: string, locale: Locale = "ru"): Parts {
  const date = new Date(iso);
  const bag = Object.fromEntries(
    new Intl.DateTimeFormat(INTL[locale], {
      timeZone: TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return {
    day: bag.day || "",
    month: bag.month || "",
    year: bag.year || "",
    hour: bag.hour || "",
    minute: bag.minute || "",
    key,
  };
}

export function formatDate(iso: string, locale: Locale = "ru") {
  const p = parts(iso, locale);
  return `${p.day} ${p.month} ${p.year}`;
}

export function formatTime(iso: string, locale: Locale = "ru") {
  const p = parts(iso, locale);
  return `${p.hour}:${p.minute}`;
}

export function formatDateTime(iso: string, locale: Locale = "ru") {
  return `${formatDate(iso, locale)}, ${formatTime(iso, locale)}`;
}

export function formatRange(startsAt: string, endsAt: string | null, locale: Locale = "ru") {
  const start = parts(startsAt, locale);
  const date = `${start.day} ${start.month} ${start.year}`;
  const startTime = `${start.hour}:${start.minute}`;
  if (!endsAt) return { date, time: startTime };
  const end = parts(endsAt, locale);
  const endTime = `${end.hour}:${end.minute}`;
  if (start.key === end.key) return { date, time: `${startTime}–${endTime}` };
  return {
    date: `${start.day} ${start.month} — ${end.day} ${end.month} ${end.year}`,
    time: `${startTime}–${endTime}`,
  };
}

export function toAlmatyInput(iso: string) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${day}T${time}`;
}

export function fromAlmatyInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return null;
  const date = new Date(`${trimmed.slice(0, 16)}:00+05:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isRegistrationOpen(startsAt: string, now = Date.now()) {
  const start = new Date(startsAt).getTime();
  return Number.isFinite(start) && start > now;
}
