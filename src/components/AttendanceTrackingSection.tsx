import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Attendance, Shift, UserSummary } from "../api/types";
import { formatTime } from "../lib/formatDate";
import { mapsUrl } from "../lib/geolocation";
import { useAuth } from "../auth/AuthContext";
import { getDateLocale } from "../i18n";
import { dateKey, startOfWeek, getWeekNumber } from "../lib/rosterDates";
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

type ModalState =
  | { mode: "add"; userId: number; userName: string; shift: Shift }
  | { mode: "edit"; userId: number; userName: string; attendance: Attendance };

export default function AttendanceTrackingSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [recordsByUser, setRecordsByUser] = useState<Map<number, Attendance[]>>(new Map());
  const [shiftsByUser, setShiftsByUser] = useState<Map<number, Shift[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
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
    if (people.length === 0) return;
    setLoading(true);
    Promise.all(
      people.map((p) =>
        Promise.all([api.listAttendanceForReport(p.id), api.listShiftsForReport(p.id)]).then(
          ([records, shifts]) => [p.id, records, shifts] as const,
        ),
      ),
    )
      .then((results) => {
        setRecordsByUser(new Map(results.map(([id, records]) => [id, records])));
        setShiftsByUser(new Map(results.map(([id, , shifts]) => [id, shifts])));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  useEffect(reload, [reports.length, user?.id]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString(getDateLocale(), { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString(getDateLocale(), { month: "short", day: "numeric", year: "numeric" })}`;
  const weekNumber = useMemo(() => getWeekNumber(weekStart), [weekStart]);

  function recordsFor(userId: number, day: Date): Attendance[] {
    const key = dateKey(day);
    return (recordsByUser.get(userId) ?? []).filter(
      (r) => r.clockIn && dateKey(new Date(r.clockIn)) === key,
    );
  }

  function missingShiftFor(userId: number, day: Date): Shift | null {
    const key = dateKey(day);
    const records = recordsByUser.get(userId) ?? [];
    const shift = (shiftsByUser.get(userId) ?? []).find(
      (s) =>
        dateKey(new Date(s.startsAt)) === key &&
        new Date(s.startsAt).getTime() < Date.now() &&
        !records.some((r) => r.shiftId === s.id),
    );
    return shift ?? null;
  }

  function openAdd(userId: number, userName: string, shift: Shift) {
    setModal({ mode: "add", userId, userName, shift });
    setClockInVal(toLocalInput(shift.startsAt));
    setClockOutVal("");
    setModalError(null);
  }

  function openEdit(userId: number, userName: string, record: Attendance) {
    setModal({ mode: "edit", userId, userName, attendance: record });
    setClockInVal(record.clockIn ? toLocalInput(record.clockIn) : "");
    setClockOutVal(record.clockOut ? toLocalInput(record.clockOut) : "");
    setModalError(null);
  }

  // Same reasoning as the roster shift modal: the calendar day is fixed to
  // whatever clock-in day this record is already on (shown separately
  // above the form), and only the time-of-day is directly editable. Clock
  // out stays optional -- empty means "still clocked in", not "overnight".
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

  function handleClockInTimeChange(hhmm: string) {
    const baseDate = clockInVal ? datePart(clockInVal) : datePart(clockOutVal);
    setClockInVal(`${baseDate}T${hhmm}`);
    if (!clockOutVal) return;
    const outHHMM = timePart(clockOutVal);
    setClockOutVal(`${outHHMM <= hhmm ? addDays(baseDate, 1) : baseDate}T${outHHMM}`);
  }

  function handleClockOutTimeChange(hhmm: string) {
    if (!hhmm) {
      setClockOutVal("");
      return;
    }
    const baseDate = datePart(clockInVal);
    const inHHMM = timePart(clockInVal);
    setClockOutVal(`${hhmm <= inHHMM ? addDays(baseDate, 1) : baseDate}T${hhmm}`);
  }

  const attendanceEndsNextDay =
    clockInVal && clockOutVal && datePart(clockOutVal) !== datePart(clockInVal);

  const attendanceDurationLabel = (() => {
    if (!clockInVal || !clockOutVal) return null;
    const totalMin = Math.round((new Date(clockOutVal).getTime() - new Date(clockInVal).getTime()) / 60000);
    if (totalMin <= 0) return null;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  })();

  async function handleModalSave(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    setModalError(null);
    try {
      if (modal.mode === "add") {
        await api.createManualAttendance(modal.userId, {
          shiftId: modal.shift.id,
          clockIn: toIso(clockInVal),
          clockOut: clockOutVal ? toIso(clockOutVal) : undefined,
        });
      } else {
        await api.editManualAttendance(modal.userId, modal.attendance.id, {
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

      <div className="roster-week-nav">
        <span className="roster-week-number">{t("adminRoster.weekNumber", { n: weekNumber })}</span>
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() - 7);
              return d;
            })
          }
        >
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="roster-week-label" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          {weekLabel}
        </button>
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() + 7);
              return d;
            })
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <p className="hint">{t("common.loading")}</p>
      ) : (
        <div className="attendance-grid-scroll">
          <table className="attendance-grid">
            <thead>
              <tr>
                <th className="attendance-grid-person-col" />
                {weekDays.map((d) => (
                  <th key={dateKey(d)}>
                    {d.toLocaleDateString(getDateLocale(), { weekday: "short", day: "numeric" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td className="attendance-grid-person-col">
                    <Avatar userId={p.id} name={p.name} hasAvatar={p.hasAvatar} size={28} />
                    <span>{p.name}</span>
                  </td>
                  {weekDays.map((d) => {
                    const dayRecords = recordsFor(p.id, d);
                    const missing = dayRecords.length === 0 ? missingShiftFor(p.id, d) : null;
                    return (
                      <td key={dateKey(d)} className="attendance-grid-cell">
                        {dayRecords.map((r) => (
                          <button
                            type="button"
                            key={r.id}
                            className="attendance-cell-entry"
                            onClick={() => openEdit(p.id, p.name, r)}
                          >
                            <span className="attendance-cell-time">
                              {r.clockIn ? formatTime(r.clockIn) : "-"}
                              {" – "}
                              {r.clockOut ? (
                                formatTime(r.clockOut)
                              ) : (
                                <span className="status-badge pending">{t("attendanceTracking.active")}</span>
                              )}
                            </span>
                            {(r.clockInLat != null || r.clockOutLat != null) && (
                              <span className="attendance-cell-links">
                                {r.clockInLat != null && r.clockInLng != null && (
                                  <a
                                    href={mapsUrl(r.clockInLat, r.clockInLng)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MapPin size={10} /> {t("attendanceTracking.in")}
                                  </a>
                                )}
                                {r.clockOutLat != null && r.clockOutLng != null && (
                                  <a
                                    href={mapsUrl(r.clockOutLat, r.clockOutLng)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MapPin size={10} /> {t("attendanceTracking.out")}
                                  </a>
                                )}
                              </span>
                            )}
                          </button>
                        ))}
                        {missing && (
                          <button
                            type="button"
                            className="attendance-cell-add"
                            onClick={() => openAdd(p.id, p.name, missing)}
                            title={t("attendanceTracking.add")}
                          >
                            <Plus size={13} />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {modal.mode === "add"
                ? t("attendanceTracking.addTitleFor", { name: modal.userName })
                : t("attendanceTracking.editTitleFor", { name: modal.userName })}
            </h3>
            {clockInVal && (
              <p className="hint">
                {new Date(clockInVal).toLocaleDateString(getDateLocale(), {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <form onSubmit={handleModalSave}>
              <div className="shift-time-row">
                <label className="field shift-time-field">
                  <span className="field-label">{t("attendanceTracking.clockInLabel")}</span>
                  <input
                    type="time"
                    value={timePart(clockInVal)}
                    onChange={(e) => handleClockInTimeChange(e.target.value)}
                    required
                  />
                </label>
                <span className="shift-time-arrow">→</span>
                <label className="field shift-time-field">
                  <span className="field-label">
                    {t("attendanceTracking.clockOutLabel")}
                    {attendanceEndsNextDay && (
                      <span className="shift-next-day-tag">{t("adminRoster.nextDay")}</span>
                    )}
                  </span>
                  <input
                    type="time"
                    value={timePart(clockOutVal)}
                    onChange={(e) => handleClockOutTimeChange(e.target.value)}
                  />
                </label>
              </div>
              {attendanceDurationLabel && (
                <p className="shift-duration-readout">
                  {t("adminRoster.shiftDuration", { duration: attendanceDurationLabel })}
                </p>
              )}
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
