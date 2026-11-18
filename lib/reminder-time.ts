export const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export function reminderDueAt(startsAt: string) {
  return new Date(new Date(startsAt).getTime() - TWO_DAYS_MS);
}

export function reminderPhase(startsAt: string, now = Date.now()): "wait" | "due" | "missed" {
  const start = new Date(startsAt).getTime();
  if (!Number.isFinite(start) || now >= start) return "missed";
  if (now >= start - TWO_DAYS_MS) return "due";
  return "wait";
}
