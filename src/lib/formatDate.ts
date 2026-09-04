import i18n, { getDateLocale } from "../i18n";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(getDateLocale(), { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(getDateLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function compactTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? "a" : "p";
  const minutes = d.getMinutes();
  return minutes === 0
    ? `${displayHour}${period}`
    : `${displayHour}:${String(minutes).padStart(2, "0")}${period}`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return i18n.t("common.justNow");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return i18n.t("common.minAgo", { n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return i18n.t("common.hourAgo", { n: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return i18n.t("common.dayAgo", { n: diffDay });
  return new Date(iso).toLocaleDateString(getDateLocale(), { month: "short", day: "numeric" });
}
