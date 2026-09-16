import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Department, OpenShift, ShiftType, TeamMember } from "../api/types";
import { toDatetimeLocal, toIso, toLocalInput } from "../lib/rosterDates";

type OpenShiftModalState =
  | { mode: "add"; day: Date; departmentId?: number }
  | { mode: "edit"; openShift: OpenShift };

const BREAK_OPTIONS = ["", "15", "30", "45", "60"];

export default function OpenShiftModal({
  state,
  departments,
  shiftTypes,
  people,
  onClose,
  onSaved,
}: {
  state: OpenShiftModalState;
  departments: Department[];
  shiftTypes: ShiftType[];
  people: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const existing = state.mode === "edit" ? state.openShift : null;

  const [departmentId, setDepartmentId] = useState(
    (state.mode === "add" ? state.departmentId : existing?.departmentId) ?? "",
  );
  const [shiftTypeId, setShiftTypeId] = useState(existing?.shiftTypeId ?? "");
  const [start, setStart] = useState(
    existing ? toLocalInput(existing.startsAt) : toDatetimeLocal(state.mode === "add" ? state.day : new Date(), 9, 0),
  );
  const [end, setEnd] = useState(
    existing ? toLocalInput(existing.endsAt) : toDatetimeLocal(state.mode === "add" ? state.day : new Date(), 17, 0),
  );
  const [breakMinutes, setBreakMinutes] = useState(existing?.breakMinutes ? String(existing.breakMinutes) : "");
  const [requiredCount, setRequiredCount] = useState(existing?.requiredCount ?? 1);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Same time-only-picker pattern as the roster shift modal -- the day is
  // fixed to whatever day this open shift already starts on, and an end
  // time earlier than the start time means "next day" instead of an
  // unreachable state.
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
    const endHHMM = timePart(end);
    setEnd(`${endHHMM <= hhmm ? addDays(baseDate, 1) : baseDate}T${endHHMM}`);
  }
  function handleEndTimeChange(hhmm: string) {
    const baseDate = datePart(start);
    const startHHMM = timePart(start);
    setEnd(`${hhmm <= startHHMM ? addDays(baseDate, 1) : baseDate}T${hhmm}`);
  }
  const endsNextDay = datePart(end) !== datePart(start);
  const durationLabel = (() => {
    const totalMin = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (totalMin <= 0) return null;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  })();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        departmentId: departmentId ? Number(departmentId) : undefined,
        shiftTypeId: shiftTypeId ? Number(shiftTypeId) : undefined,
        startsAt: toIso(start),
        endsAt: toIso(end),
        breakMinutes: breakMinutes ? Number(breakMinutes) : undefined,
        requiredCount: Number(requiredCount),
        notes: notes.trim() || undefined,
      };
      if (state.mode === "add") {
        await api.createOpenShift(payload);
      } else {
        await api.updateOpenShift(state.openShift.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.openShiftSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteOpenShift(existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.openShiftDeleteFailed"));
      setSaving(false);
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!existing || !assignUserId) return;
    setAssigning(true);
    setError(null);
    try {
      await api.assignOpenShift(existing.id, { userId: Number(assignUserId) });
      setAssignUserId("");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.openShiftAssignFailed"));
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(userId: number, shiftId: number) {
    setError(null);
    try {
      await api.deleteShiftForReport(userId, shiftId);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.removeShiftFailed"));
    }
  }

  async function handleApproveRequest(requestId: number) {
    setError(null);
    try {
      await api.approveOpenShiftRequest(requestId);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.openShiftAssignFailed"));
    }
  }

  async function handleRejectRequest(requestId: number) {
    setError(null);
    try {
      await api.rejectOpenShiftRequest(requestId);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.openShiftRequestRejectFailed"));
    }
  }

  const pendingRequests = existing?.requests.filter((r) => r.status === "pending") ?? [];

  const assignedUserIds = new Set(existing?.filledShifts.map((f) => f.userId) ?? []);
  const eligiblePeople = people.filter((p) => !assignedUserIds.has(p.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("adminRoster.openShiftTitle")}</h3>
        <form onSubmit={handleSave}>
          <label className="field">
            <span className="field-label">{t("rosterConfig.departmentsTab")}</span>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{t("adminRoster.departmentUnassigned")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.shiftTypeLabel")}</span>
            <select value={shiftTypeId} onChange={(e) => setShiftTypeId(e.target.value)}>
              <option value="">{t("adminRoster.shiftTypeNone")}</option>
              {shiftTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
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
          {durationLabel && (
            <p className="shift-duration-readout">{t("adminRoster.shiftDuration", { duration: durationLabel })}</p>
          )}
          <label className="field">
            <span className="field-label">{t("adminRoster.breakLabel")}</span>
            <select value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)}>
              {BREAK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "" ? t("adminRoster.breakNone") : t("adminRoster.breakMinSuffix", { min: opt })}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.requiredCountLabel")}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={requiredCount}
              onChange={(e) => setRequiredCount(Number(e.target.value))}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.notesLabel")}</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
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

        {existing && pendingRequests.length > 0 && (
          <div className="roster-open-assign-section">
            <h4>{t("adminRoster.openShiftRequestsTitle")}</h4>
            <ul className="roster-open-assign-list">
              {pendingRequests.map((r) => (
                <li key={r.id}>
                  <span>{r.userName}</span>
                  <span className="roster-open-request-actions">
                    <button type="button" onClick={() => handleApproveRequest(r.id)}>
                      {t("adminRoster.openShiftApproveRequest")}
                    </button>
                    <button type="button" className="danger" onClick={() => handleRejectRequest(r.id)}>
                      {t("adminRoster.openShiftRejectRequest")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {existing && (
          <div className="roster-open-assign-section">
            <h4>{t("adminRoster.openShiftFilledTitle", { filled: existing.filledCount, required: existing.requiredCount })}</h4>
            {existing.filledShifts.length > 0 && (
              <ul className="roster-open-assign-list">
                {existing.filledShifts.map((f) => (
                  <li key={f.shiftId}>
                    <span>{f.userName}</span>
                    <button type="button" onClick={() => handleUnassign(f.userId, f.shiftId)}>
                      {t("team.remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {eligiblePeople.length > 0 && (
              <form onSubmit={handleAssign} className="roster-open-assign-form">
                <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} required>
                  <option value="">{t("adminRoster.openShiftAssignTitle")}</option>
                  {eligiblePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={assigning || !assignUserId}>
                  {t("adminRoster.openShiftAssign")}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
