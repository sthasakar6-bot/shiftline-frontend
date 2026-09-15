import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { RosterEvent } from "../api/types";
import { toDatetimeLocal, toIso, toLocalInput } from "../lib/rosterDates";

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
        <form onSubmit={handleSave}>
          <label className="field">
            <span className="field-label">{t("adminRoster.eventTitleLabel")}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.shiftStarts")}</span>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="field-checkbox">
            <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} />
            <span>{t("adminRoster.eventTimeOptional")}</span>
          </label>
          {hasEnd && (
            <label className="field">
              <span className="field-label">{t("adminRoster.shiftEnds")}</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </label>
          )}
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
