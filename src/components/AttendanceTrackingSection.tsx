import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Pencil, Plus } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Attendance, Shift, UserSummary } from "../api/types";
import { formatTime, formatDuration } from "../lib/formatDate";
import { mapsUrl } from "../lib/geolocation";
import { useAuth } from "../auth/AuthContext";
import { getDateLocale } from "../i18n";
import Avatar from "./Avatar";

// datetime-local gives a plain string with no timezone -- interpreting it via
// `new Date(...)` reads it as the browser's local time, and toISOString()
// converts that to the correct UTC instant to send.
function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ModalState = { mode: "add"; shift: Shift } | { mode: "edit"; attendance: Attendance };

export default function AttendanceTrackingSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [clockInVal, setClockInVal] = useState("");
  const [clockOutVal, setClockOutVal] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const youLabel = `(${t("common.you")})`;
  const people = user
    ? [{ id: user.id, name: `${user.name} ${youLabel}`, hasAvatar: user.hasAvatar }, ...reports]
    : reports;

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  function reload() {
    if (!selected) return;
    api.listAttendanceForReport(Number(selected)).then(setRecords).catch(() => {});
    api.listShiftsForReport(Number(selected)).then(setShifts).catch(() => {});
  }

  useEffect(() => {
    if (selected) {
      reload();
    } else {
      setRecords([]);
      setShifts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const selectedPerson = people.find((p) => p.id === Number(selected));
  const sortedRecords = [...records].sort((a, b) => {
    const aTime = a.clockIn ? new Date(a.clockIn).getTime() : 0;
    const bTime = b.clockIn ? new Date(b.clockIn).getTime() : 0;
    return bTime - aTime;
  });
  const missingShifts = shifts
    .filter(
      (s) => new Date(s.startsAt).getTime() < Date.now() && !records.some((r) => r.shiftId === s.id),
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  function openAdd(shift: Shift) {
    setModal({ mode: "add", shift });
    setClockInVal(toLocalInput(shift.startsAt));
    setClockOutVal("");
    setModalError(null);
  }

  function openEdit(record: Attendance) {
    setModal({ mode: "edit", attendance: record });
    setClockInVal(record.clockIn ? toLocalInput(record.clockIn) : "");
    setClockOutVal(record.clockOut ? toLocalInput(record.clockOut) : "");
    setModalError(null);
  }

  async function handleModalSave(e: FormEvent) {
    e.preventDefault();
    if (!modal || !selected) return;
    setSaving(true);
    setModalError(null);
    try {
      if (modal.mode === "add") {
        await api.createManualAttendance(Number(selected), {
          shiftId: modal.shift.id,
          clockIn: toIso(clockInVal),
          clockOut: clockOutVal ? toIso(clockOutVal) : undefined,
        });
      } else {
        await api.editManualAttendance(Number(selected), modal.attendance.id, {
          clockIn: toIso(clockInVal),
          clockOut: clockOutVal ? toIso(clockOutVal) : undefined,
        });
      }
      setModal(null);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : t("attendanceTracking.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h2>{t("attendanceTracking.title")}</h2>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("team.selectEmployee")}</option>
          {people.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selected && selectedPerson && (
        <div className="attendance-track-header">
          <Avatar
            userId={selectedPerson.id}
            name={selectedPerson.name}
            hasAvatar={selectedPerson.hasAvatar}
            size={30}
          />
          <span className="attendance-track-header-name">{selectedPerson.name}</span>
          <span className="attendance-track-header-count">
            {t("attendanceTracking.record", { count: sortedRecords.length })}
          </span>
        </div>
      )}

      {selected && missingShifts.length > 0 && (
        <div>
          <div className="panel-subtitle">
            <h3>{t("attendanceTracking.missingTitle")}</h3>
          </div>
          <ul className="attendance-track-rows">
            {missingShifts.map((s) => (
              <li key={s.id} className="attendance-track-row">
                <div className="attendance-track-main">
                  <span className="attendance-track-date">
                    {new Date(s.startsAt).toLocaleDateString(getDateLocale(), {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="attendance-track-range">
                    {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                  </span>
                </div>
                <button type="button" className="icon-btn" onClick={() => openAdd(s)}>
                  <Plus size={14} /> {t("attendanceTracking.add")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && (
        <ul className="attendance-track-rows">
          {sortedRecords.map((r) => (
            <li key={r.id} className="attendance-track-row">
              <div className="attendance-track-main">
                <span className="attendance-track-date">
                  {r.clockIn
                    ? new Date(r.clockIn).toLocaleDateString(getDateLocale(), {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : t("attendance.unknownDate")}
                  {r.manualEntry && (
                    <span className="status-badge pending">{t("attendanceTracking.manualBadge")}</span>
                  )}
                </span>
                <span className="attendance-track-range">
                  {r.clockIn ? formatTime(r.clockIn) : "-"} –{" "}
                  {r.clockOut ? (
                    formatTime(r.clockOut)
                  ) : (
                    <span className="status-badge pending">{t("attendanceTracking.active")}</span>
                  )}
                  {r.clockIn && r.clockOut && (
                    <> · {formatDuration(new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime())}</>
                  )}
                </span>
              </div>
              {(r.clockInLat != null || r.clockOutLat != null) && (
                <div className="attendance-track-links">
                  {r.clockInLat != null && r.clockInLng != null && (
                    <a
                      className="attendance-track-map"
                      href={mapsUrl(r.clockInLat, r.clockInLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={11} /> {t("attendanceTracking.in")}
                    </a>
                  )}
                  {r.clockOutLat != null && r.clockOutLng != null && (
                    <a
                      className="attendance-track-map"
                      href={mapsUrl(r.clockOutLat, r.clockOutLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={11} /> {t("attendanceTracking.out")}
                    </a>
                  )}
                </div>
              )}
              <button type="button" className="icon-btn" onClick={() => openEdit(r)}>
                <Pencil size={14} /> {t("common.edit")}
              </button>
            </li>
          ))}
          {sortedRecords.length === 0 && (
            <li className="leave-empty">{t("attendanceTracking.noRecords")}</li>
          )}
        </ul>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modal.mode === "add"
                ? t("attendanceTracking.addTitle")
                : t("attendanceTracking.editTitle")}
            </h3>
            <form onSubmit={handleModalSave}>
              <label className="field">
                <span className="field-label">{t("attendanceTracking.clockInLabel")}</span>
                <input
                  type="datetime-local"
                  value={clockInVal}
                  onChange={(e) => setClockInVal(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">{t("attendanceTracking.clockOutLabel")}</span>
                <input
                  type="datetime-local"
                  value={clockOutVal}
                  onChange={(e) => setClockOutVal(e.target.value)}
                />
              </label>
              {modalError && <div className="error">{modalError}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setModal(null)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={saving}>
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
