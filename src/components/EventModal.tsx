import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { RosterEvent } from "../api/types";
import { toDatetimeLocal, toIso, toLocalInput } from "../lib/rosterDates";
import { getDateLocale } from "../i18n";

type EventModalState = { mode: "add"; day: Date } | { mode: "edit"; event: RosterEvent };

export default function EventModal({
  state,
  onClose,
  onSaved,
}: {
  state: EventModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const existing = state.mode === "edit" ? state.event : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [start, setStart] = useState(
    existing ? toLocalInput(existing.startsAt) : toDatetimeLocal(state.mode === "add" ? state.day : new Date(), 20, 0),
  );
  const [hasEnd, setHasEnd] = useState(Boolean(existing?.endsAt));
  const [end, setEnd] = useState(
    existing?.endsAt ? toLocalInput(existing.endsAt) : toDatetimeLocal(state.mode === "add" ? state.day : new Date(), 23, 0),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same time-only-picker pattern as the other roster modals -- the day is
  // fixed to whichever day cell this event was opened from.
  function datePart(dtLocal: string): string {
    return dtLocal.slice(0, 10);
  }
  function timePart(dtLocal: string): string {
    return dtLocal.slice(11, 16);
  }
  function addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function handleStartTimeChange(hhmm: string) {
    const baseDate = datePart(start);
    setStart(`${baseDate}T${hhmm}`);
    if (!hasEnd) return;
    const endHHMM = timePart(end);
    setEnd(`${endHHMM <= hhmm ? addDays(baseDate, 1) : baseDate}T${endHHMM}`);
  }
  function handleEndTimeChange(hhmm: string) {
    const baseDate = datePart(start);
    const startHHMM = timePart(start);
    setEnd(`${hhmm <= startHHMM ? addDays(baseDate, 1) : baseDate}T${hhmm}`);
  }
  const endsNextDay = hasEnd && datePart(end) !== datePart(start);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title,
        startsAt: toIso(start),
        endsAt: hasEnd ? toIso(end) : null,
      };
      if (state.mode === "add") {
        await api.createEvent(payload);
      } else {
        await api.updateEvent(state.event.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.eventSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteEvent(existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.eventDeleteFailed"));
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("adminRoster.eventTitle")}</h3>
        <p className="hint">
          {new Date(start).toLocaleDateString(getDateLocale(), {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <form onSubmit={handleSave}>
          <label className="field">
            <span className="field-label">{t("adminRoster.eventTitleLabel")}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>
          {!hasEnd ? (
            <label className="field">
              <span className="field-label">{t("adminRoster.shiftStarts")}</span>
              <input type="time" value={timePart(start)} onChange={(e) => handleStartTimeChange(e.target.value)} required />
            </label>
          ) : (
            <div className="shift-time-row">
              <label className="field shift-time-field">
                <span className="field-label">{t("adminRoster.shiftStarts")}</span>
                <input type="time" value={timePart(start)} onChange={(e) => handleStartTimeChange(e.target.value)} required />
              </label>
              <span className="shift-time-arrow">→</span>
              <label className="field shift-time-field">
                <span className="field-label">
                  {t("adminRoster.shiftEnds")}
                  {endsNextDay && <span className="shift-next-day-tag">{t("adminRoster.nextDay")}</span>}
                </span>
                <input type="time" value={timePart(end)} onChange={(e) => handleEndTimeChange(e.target.value)} required />
              </label>
            </div>
          )}
          <label className="field-checkbox">
            <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} />
            <span>{t("adminRoster.eventTimeOptional")}</span>
          </label>
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            {state.mode === "edit" && (
              <button type="button" className="danger modal-action-detach" onClick={handleDelete} disabled={saving}>
                {t("common.delete")}
              </button>
            )}
            <button type="button" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving}>
              {t("adminRoster.assign")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
