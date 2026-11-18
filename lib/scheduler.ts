import { processReminders } from "./reminders";

const globalForTimer = globalThis as unknown as { __reminderTimer?: NodeJS.Timeout };

export function startScheduler() {
  if (globalForTimer.__reminderTimer) return;
  void processReminders();
  globalForTimer.__reminderTimer = setInterval(() => {
    void processReminders();
  }, 60_000);
  console.log("[reminders] scheduler started");
}
