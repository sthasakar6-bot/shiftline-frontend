import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Attendance, Shift } from "../api/types";
import { formatDateTime, formatTime } from "../lib/formatDate";
import { getCurrentCoords } from "../lib/geolocation";

export default function AttendanceSection() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listAttendance().then(setRecords).catch(() => {});
    api.listShifts().then(setShifts).catch(() => {});
  }

  useEffect(load, []);

  async function handleClockIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const coords = await getCurrentCoords();
      await api.clockIn(Number(shiftId), coords);
      setShiftId("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock in");
    }
  }

  async function handleClockOut(id: number) {
    setError(null);
    try {
      const coords = await getCurrentCoords();
      await api.clockOut(id, coords);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock out");
    }
  }

  return (
    <section className="panel">
      <h2>Attendance</h2>
      <form className="inline-form" onSubmit={handleClockIn}>
        <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
          <option value="">Select a shift to clock in</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {formatDateTime(s.startsAt)}
            </option>
          ))}
        </select>
        <button type="submit">Clock in</button>
      </form>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {records.map((r) => (
          <li key={r.id}>
            <span>
              Shift #{r.shiftId} — in: {r.clockIn ? formatTime(r.clockIn) : "-"}, out:{" "}
              {r.clockOut ? formatTime(r.clockOut) : "-"}
            </span>
            {!r.clockOut && (
              <span className="actions">
                <button onClick={() => handleClockOut(r.id)}>Clock out</button>
              </span>
            )}
          </li>
        ))}
        {records.length === 0 && <li className="empty">No attendance records yet.</li>}
      </ul>
    </section>
  );
}
