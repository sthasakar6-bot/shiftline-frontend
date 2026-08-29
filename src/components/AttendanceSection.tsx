import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Attendance, Shift } from "../api/types";
import { formatDateTime, formatTime } from "../lib/formatDate";
import { getCurrentCoords } from "../lib/geolocation";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AttendanceSection() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  function load() {
    api.listAttendance().then(setRecords).catch(() => {});
    api.listShifts().then(setShifts).catch(() => {});
  }

  useEffect(load, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openRecord = records.find((r) => !r.clockOut);
  const pastRecords = records
    .filter((r) => r.id !== openRecord?.id)
    .sort((a, b) => {
      const aTime = a.clockIn ? new Date(a.clockIn).getTime() : 0;
      const bTime = b.clockIn ? new Date(b.clockIn).getTime() : 0;
      return bTime - aTime;
    });
  const completedShiftIds = new Set(records.filter((r) => r.clockOut).map((r) => r.shiftId));
  const clockableShifts = shifts.filter((s) => !completedShiftIds.has(s.id));

  async function handleClockIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const coords = await getCurrentCoords();
      await api.clockIn(Number(shiftId), coords);
      setShiftId("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock in");
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut(id: number) {
    setError(null);
    setBusy(true);
    try {
      const coords = await getCurrentCoords();
      await api.clockOut(id, coords);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock out");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Attendance</h2>

      <div className="clock-display">
        <div className="clock-time">
          {now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
        <div className="clock-date">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {openRecord ? (
        <div className="clock-status clocked-in">
          <span className="status-dot" />
          <div>
            <strong>You're clocked in</strong>
            <div className="clock-elapsed">
              {formatElapsed(
                now.getTime() - (openRecord.clockIn ? new Date(openRecord.clockIn).getTime() : now.getTime()),
              )}
            </div>
          </div>
          <button
            className="clock-action out"
            onClick={() => handleClockOut(openRecord.id)}
            disabled={busy}
          >
            Clock Out
          </button>
        </div>
      ) : (
        <form className="clock-status" onSubmit={handleClockIn}>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
            <option value="">Select a shift</option>
            {clockableShifts.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDateTime(s.startsAt)}
              </option>
            ))}
          </select>
          <button type="submit" className="clock-action in" disabled={busy}>
            Clock In
          </button>
        </form>
      )}
      {error && <div className="error">{error}</div>}

      <h3>History</h3>
      <ul className="list">
        {pastRecords.map((r) => (
          <li key={r.id}>
            <span>
              <strong>
                {r.clockIn
                  ? new Date(r.clockIn).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "Unknown date"}
              </strong>
              <br />
              {r.clockIn ? formatTime(r.clockIn) : "-"} – {r.clockOut ? formatTime(r.clockOut) : "-"}
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
        {pastRecords.length === 0 && <li className="empty">No attendance records yet.</li>}
      </ul>
    </section>
  );
}
