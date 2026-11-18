import { formatDateTime } from "./format";
import type { Locale } from "./locale";
import { fill, messages } from "./messages";
import { reminderDueAt } from "./reminder-time";
import type { RegistrationRecord } from "./types";

function why(locale: Locale, value: string | null) {
  const text = messages[locale];
  if (!value) return text.remNotSent;
  if (value === "started" || value === "Мероприятие уже началось") return text.remStarted;
  if (value === "no-email" || value === "Не указана почта") return text.remNoMail;
  if (value === "saved-local" || value === "Почта не настроена, письмо сохранено в data/outbox") return text.remSaved;
  if (value === "not-sent" || value === "не отправилось") return text.remNotSent;
  return value;
}

export function reminderLabel(row: RegistrationRecord, startsAt: string, locale: Locale = "ru") {
  const text = messages[locale];
  if (!row.remind || row.reminder_status === "none") return text.remNone;
  if (row.reminder_status === "scheduled") {
    return fill(text.remWait, { when: formatDateTime(reminderDueAt(startsAt).toISOString(), locale) });
  }
  if (row.reminder_status === "sent" && row.reminder_sent_at) {
    return fill(text.remSentAt, { when: formatDateTime(row.reminder_sent_at, locale) });
  }
  if (row.reminder_status === "sent") return text.remSent;
  if (row.reminder_status === "saved") return text.remSaved;
  if (row.reminder_status === "error") return fill(text.remError, { why: why(locale, row.reminder_error) });
  if (row.reminder_status === "skipped") return why(locale, row.reminder_error);
  return row.reminder_status;
}
