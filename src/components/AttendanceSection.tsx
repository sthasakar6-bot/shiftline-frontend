import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock, WifiOff } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Shift } from "../api/types";
import { formatDateTime, formatTime, formatDuration } from "../lib/formatDate";
import { getDateLocale } from "../i18n";
import { getCurrentCoords } from "../lib/geolocation";
import {
  getPendingAttendance,
  mergeAttendance,
  queueClockIn,
  queueClockOut,
  queueClockOutForServerRecord,
  watchForSync,
  type DisplayAttendance,
} from "../lib/offlineAttendance";
import ConfirmDialog from "./ConfirmDialog";
import { SkeletonLine, SkeletonRows } from "./Skeleton";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function ClockFace({ now }: { now: Date }) {
  const parts = new Intl.DateTimeFormat(getDateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);

  return (
    <div className="clock-time">
      {parts.map((part, i) => {
        if (part.type === "literal" && part.value === ":") {
          return (
            <span key={i} className="clock-colon">
              :
            </span>
          );
        }
        if (part.type === "dayPeriod") {
          return (
            <span key={i} className="clock-period">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

export default function AttendanceSection() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<DisplayAttendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [confirmAction, setConfirmAction] = useState<"in" | "out" | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTick, setPendingTick] = useState(0);

  function bumpPending() {
    setPendingTick((n) => n + 1);
  }

  function load() {
    Promise.all([
      api.listAttendance().then(setRecords).catch(() => {}),
      api.listShifts().then(setShifts).catch(() => {}),
    ]).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => watchForSync(load), []);

  const displayRecords = useMemo(
    () => mergeAttendance(records, getPendingAttendance()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, pendingTick],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openRecord = displayRecords.find((r) => !r.clockOut);
  const pastRecords = displayRecords
    .filter((r) => r.id !== openRecord?.id)
    .sort((a, b) => {
      const aTime = a.clockIn ? new Date(a.clockIn).getTime() : 0;
      const bTime = b.clockIn ? new Date(b.clockIn).getTime() : 0;
      return bTime - aTime;
    });
  const completedShiftIds = new Set(
    displayRecords.filter((r) => r.clockOut).map((r) => r.shiftId),
  );
  const clockableShifts = shifts
    .filter((s) => !completedShiftIds.has(s.id))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const todaysShifts = clockableShifts.filter(
    (s) => new Date(s.startsAt).toDateString() === now.toDateString(),
  );
  const featuredShift = todaysShifts[0] ?? clockableShifts[0];
  const isFeaturedToday = featuredShift
    ? new Date(featuredShift.startsAt).toDateString() === now.toDateString()
    : false;
  const needsShiftPicker = clockableShifts.length > 1;
  const effectiveShiftId =
    shiftId || (!needsShiftPicker && featuredShift ? String(featuredShift.id) : "");

  function handleClockInClick() {
    if (!effectiveShiftId) return;
    setShiftId(effectiveShiftId);
    setConfirmAction("in");
  }

  async function confirmClockIn() {
    setConfirmAction(null);
    setError(null);
    setBusy(true);
    const coords = await getCurrentCoords();
    try {
      await api.clockIn(Number(effectiveShiftId), coords);
      setShiftId("");
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        queueClockIn(Number(effectiveShiftId), coords);
        setShiftId("");
        bumpPending();
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmClockOut() {
    if (!openRecord) return;
    setConfirmAction(null);
    setError(null);
    setBusy(true);
    const coords = await getCurrentCoords();
    try {
      if (openRecord.id < 0 && openRecord.localId) {
        queueClockOut(openRecord.localId, coords);
        bumpPending();
      } else {
        await api.clockOut(openRecord.id, coords);
        load();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (openRecord.clockIn) {
        queueClockOutForServerRecord(openRecord.id, openRecord.shiftId, openRecord.clockIn, coords);
        bumpPending();
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedShift = clockableShifts.find((s) => String(s.id) === effectiveShiftId);

  return (
    <>
      <h2>{t("attendance.title")}</h2>

      {loading ? (
        <section className="panel skeleton-card">
          <SkeletonLine width="45%" />
          <SkeletonLine width="65%" />
          <SkeletonLine width="30%" />
        </section>
      ) : openRecord ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">{t("home.currentShift")}</h3>
          <div className="shift-card-date">
            {now.toLocaleDateString(getDateLocale(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="shift-card-row">
            <Clock size={16} />
            <span>
              {t("home.since")} {openRecord.clockIn ? formatTime(openRecord.clockIn) : "--"} ·{" "}
              {formatElapsed(
                now.getTime() -
                  (openRecord.clockIn ? new Date(openRecord.clockIn).getTime() : now.getTime()),
              )}
            </span>
          </div>
          <span className="shift-status-pill in">
            <span className="presence-dot" /> {t("home.clockedIn")}
          </span>
          {openRecord.pending && (
            <span className="status-badge pending offline-badge">
              <WifiOff size={11} /> {t("attendance.pendingSync")}
            </span>
          )}
          <button
            className="shift-clock-btn out"
            onClick={() => setConfirmAction("out")}
            disabled={busy}
          >
            {t("attendance.clockOut")}
          </button>
        </section>
      ) : featuredShift ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">
            {isFeaturedToday ? t("home.todaysShift") : t("home.nextShift")}
          </h3>
          <div className="shift-card-date">
            {new Date(featuredShift.startsAt).toLocaleDateString(getDateLocale(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="shift-card-row">
            <Clock size={16} />
            <span>
              {formatTime(featuredShift.startsAt)} – {formatTime(featuredShift.endsAt)}
            </span>
          </div>
          <span className="shift-status-pill pending">{t("home.notClockedInYet")}</span>

          {needsShiftPicker && (
            <select
              className="shift-card-select"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
            >
              <option value="">{t("attendance.selectShift")}</option>
              {clockableShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.startsAt)}
                </option>
              ))}
            </select>
          )}

          <button
            className="shift-clock-btn in"
            onClick={handleClockInClick}
            disabled={busy || !effectiveShiftId}
          >
            {t("attendance.clockIn")}
          </button>
        </section>
      ) : (
        <p className="hint">{t("home.noUpcomingShifts")}</p>
      )}
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="clock-display">
          <ClockFace now={now} />
          <div className="clock-date">
            {now.toLocaleDateString(getDateLocale(), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <h3>{t("attendance.history")}</h3>
        <ul className="list">
          {loading && <SkeletonRows count={3} avatar={false} />}
          {!loading &&
            pastRecords.map((r) => (
              <li key={r.id}>
                <span>
                  <strong>
                    {r.clockIn
                      ? new Date(r.clockIn).toLocaleDateString(getDateLocale(), {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : t("attendance.unknownDate")}
                  </strong>
                  {r.pending && (
                    <span className="status-badge pending offline-badge">
                      <WifiOff size={10} /> {t("attendance.pendingSync")}
                    </span>
                  )}
                  <br />
                  {r.clockIn ? formatTime(r.clockIn) : "-"} –{" "}
                  {r.clockOut ? formatTime(r.clockOut) : "-"}
                  {r.clockIn && r.clockOut && (
                    <>
                      {" "}
                      ·{" "}
                      {formatDuration(
                        new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime(),
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          {!loading && pastRecords.length === 0 && (
            <li className="empty">{t("attendance.noHistory")}</li>
          )}
        </ul>
      </section>

      {confirmAction === "in" && (
        <ConfirmDialog
          title={t("attendance.clockInQuestion")}
          message={
            selectedShift
              ? t("attendance.clockInToShift", { time: formatDateTime(selectedShift.startsAt) })
              : t("attendance.clockInNow")
          }
          confirmLabel={t("attendance.clockIn")}
          onConfirm={confirmClockIn}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "out" && (
        <ConfirmDialog
          title={t("attendance.clockOutQuestion")}
          message={t("attendance.clockOutConfirmMessage")}
          confirmLabel={t("attendance.clockOut")}
          danger
          onConfirm={confirmClockOut}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
