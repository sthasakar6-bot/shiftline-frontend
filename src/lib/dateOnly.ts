// Leave requests store plain calendar dates ("2026-08-31"), not instants.
// Parsing that through `new Date(isoString)` reads it as UTC midnight, which
// can then display as the previous/next day depending on the viewer's local
// timezone (the same class of bug already fixed for shift times). Building
// the Date from explicit y/m/d components instead makes it unambiguously
// "that calendar day" regardless of timezone.
export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatLocalDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateOnly(iso: string): string {
  return formatLocalDate(parseIsoDateLocal(iso));
}

export function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
