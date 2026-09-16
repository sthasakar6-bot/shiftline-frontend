// datetime-local gives a plain string with no timezone (e.g. "2026-09-01T09:00")
// -- interpreting it via `new Date(...)` reads it as the browser's local time,
// and toISOString() converts that to the correct UTC instant to send, instead
// of the server assuming UTC for the naive string and silently shifting it.
export function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

// Not ISO-8601 (which starts weeks on Monday) -- deliberately counts
// Sunday-start weeks like every other week boundary in this app, so the
// number always matches the Sun-Sat range actually shown on screen.
export function getWeekNumber(weekStart: Date): number {
  const jan1WeekStart = startOfWeek(new Date(weekStart.getFullYear(), 0, 1));
  const diffDays = Math.round((weekStart.getTime() - jan1WeekStart.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

// Inverse of getWeekNumber -- the Sunday that starts the given week number
// in the given year.
export function weekStartFromNumber(year: number, weekNumber: number): Date {
  const jan1WeekStart = startOfWeek(new Date(year, 0, 1));
  const d = new Date(jan1WeekStart);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  return d;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function toDatetimeLocal(day: Date, hour: number, minute: number): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
