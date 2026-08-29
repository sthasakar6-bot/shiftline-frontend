import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { LeaveRequest, Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatTime } from "../lib/formatDate";
import { downloadCsv } from "../lib/csv";

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftHours(s: Shift): number {
  const ms = new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime();
  return ms / 3600000 - (s.breakMinutes ?? 0) / 60;
}

export default function EmployeeSummarySection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [rangeStart, setRangeStart] = useState(startOfMonth());
  const [rangeEnd, setRangeEnd] = useState(today());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const people = user ? [{ id: user.id, name: `${user.name} (you)` }, ...reports] : reports;

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setShifts([]);
      setLeaveRequests([]);
      return;
    }
    const userId = Number(selected);
    api.listShiftsForReport(userId).then(setShifts).catch(() => {});
    api.listLeaveRequestsForReport(userId).then(setLeaveRequests).catch(() => {});
  }, [selected]);

  const rangeStartMs = useMemo(() => new Date(rangeStart).getTime(), [rangeStart]);
  const rangeEndMs = useMemo(() => new Date(rangeEnd).getTime() + 86400000, [rangeEnd]);

  const shiftsInRange = useMemo(
    () =>
      shifts
        .filter((s) => {
          const t = new Date(s.startsAt).getTime();
          return t >= rangeStartMs && t < rangeEndMs;
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [shifts, rangeStartMs, rangeEndMs],
  );

  const leaveInRange = useMemo(
    () =>
      leaveRequests
        .filter((l) => {
          const start = new Date(l.startDate).getTime();
          const end = new Date(l.endDate).getTime();
          return start < rangeEndMs && end >= rangeStartMs;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [leaveRequests, rangeStartMs, rangeEndMs],
  );

  const totalHours = shiftsInRange.reduce((sum, s) => sum + shiftHours(s), 0);
  const selectedPerson = people.find((p) => String(p.id) === selected);

  function handleDownloadCsv() {
    if (!selectedPerson) return;
    const rows: string[][] = [
      ["Employee", selectedPerson.name],
      ["Date range", `${rangeStart} to ${rangeEnd}`],
      [],
      ["Shifts"],
      ["Date", "Start", "End", "Break (min)", "Hours"],
      ...shiftsInRange.map((s) => [
        new Date(s.startsAt).toLocaleDateString(),
        formatTime(s.startsAt),
        formatTime(s.endsAt),
        String(s.breakMinutes ?? 0),
        shiftHours(s).toFixed(2),
      ]),
      ["", "", "", "Total hours", totalHours.toFixed(2)],
      [],
      ["Leave requests"],
      ["Type", "Start date", "End date", "Status"],
      ...leaveInRange.map((l) => [
        l.type,
        new Date(l.startDate).toLocaleDateString(),
        new Date(l.endDate).toLocaleDateString(),
        l.status,
      ]),
    ];
    downloadCsv(`${selectedPerson.name.replace(/\s+/g, "-")}-${rangeStart}-to-${rangeEnd}.csv`, rows);
  }

  return (
    <section className="panel">
      <h2>Employee Summary</h2>
      <p className="hint">Hours worked, shift schedule, and leave history for a date range.</p>

      <div className="inline-form">
        <label className="field">
          <span className="field-label">Employee</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select employee</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">From</span>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">To</span>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
        </label>
      </div>

      {selected && (
        <>
          <p>
            <strong>{totalHours.toFixed(1)} hours</strong> scheduled across{" "}
            {shiftsInRange.length} shift{shiftsInRange.length === 1 ? "" : "s"}
          </p>

          <button onClick={handleDownloadCsv}>Download CSV</button>

          <h3>Shifts</h3>
          <ul className="list">
            {shiftsInRange.map((s) => (
              <li key={s.id}>
                <span>
                  {new Date(s.startsAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  — {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                  {s.breakMinutes && ` (break ${s.breakMinutes} min)`}
                </span>
              </li>
            ))}
            {shiftsInRange.length === 0 && <li className="empty">No shifts in this range.</li>}
          </ul>

          <h3>Leave</h3>
          <ul className="list">
            {leaveInRange.map((l) => (
              <li key={l.id}>
                <span>
                  {l.type} — {new Date(l.startDate).toLocaleDateString()} to{" "}
                  {new Date(l.endDate).toLocaleDateString()} ({l.status})
                </span>
              </li>
            ))}
            {leaveInRange.length === 0 && <li className="empty">No leave in this range.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
