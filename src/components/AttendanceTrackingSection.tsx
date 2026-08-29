import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Attendance, UserSummary } from "../api/types";
import { formatDateTime } from "../lib/formatDate";
import { mapsUrl } from "../lib/geolocation";

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
          <option value="">Select employee</option>
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
                Shift #{r.shiftId} — In: {r.clockIn ? formatDateTime(r.clockIn) : "-"}
                {r.clockInLat != null && r.clockInLng != null && (
                  <>
                    {" "}
                    (
                    <a
                      href={mapsUrl(r.clockInLat, r.clockInLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      map
                    </a>
                    )
                  </>
                )}
                <br />
                Out: {r.clockOut ? formatDateTime(r.clockOut) : "Still clocked in"}
                {r.clockOutLat != null && r.clockOutLng != null && (
                  <>
                    {" "}
                    (
                    <a
                      href={mapsUrl(r.clockOutLat, r.clockOutLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      map
                    </a>
                    )
                  </>
                )}
              </span>
            </li>
          ))}
          {records.length === 0 && <li className="empty">No attendance records.</li>}
        </ul>
      )}
    </section>
  );
}
