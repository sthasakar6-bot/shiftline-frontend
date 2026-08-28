import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Attendance, UserSummary } from "../api/types";

export default function AttendanceTrackingSection() {
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<Attendance[]>([]);

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) {
      api.listAttendanceForReport(Number(selected)).then(setRecords).catch(() => {});
    } else {
      setRecords([]);
    }
  }, [selected]);

  return (
    <section className="panel">
      <h2>Attendance Tracking</h2>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select report</option>
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <ul className="list">
          {records.map((r) => (
            <li key={r.id}>
              <span>
                Shift #{r.shiftId} — In: {r.clockIn ? new Date(r.clockIn).toLocaleString() : "-"}
                <br />
                Out: {r.clockOut ? new Date(r.clockOut).toLocaleString() : "Still clocked in"}
              </span>
            </li>
          ))}
          {records.length === 0 && <li className="empty">No attendance records.</li>}
        </ul>
      )}
    </section>
  );
}
