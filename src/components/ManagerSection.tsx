import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { UserSummary } from "../api/types";

export default function ManagerSection() {
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    api.listReports().then(setReports).catch(() => {});
  }

  useEffect(load, []);

  async function handleAssignShift(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.createShiftForReport(Number(selectedReport), { startsAt, endsAt });
      setStartsAt("");
      setEndsAt("");
      setMessage("Shift assigned.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign shift");
    }
  }

  async function handlePromote(id: number) {
    await api.promoteUser(id);
    load();
  }

  return (
    <section className="panel">
      <h2>My Team</h2>
      <ul className="list">
        {reports.map((r) => (
          <li key={r.id}>
            <span>
              {r.name} ({r.email}) — {r.role}
            </span>
            {r.role === "employee" && (
              <span className="actions">
                <button onClick={() => handlePromote(r.id)}>Promote to manager</button>
              </span>
            )}
          </li>
        ))}
        {reports.length === 0 && <li className="empty">No direct reports yet.</li>}
      </ul>

      {reports.length > 0 && (
        <>
          <h3>Assign a shift</h3>
          <form className="inline-form" onSubmit={handleAssignShift}>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              required
            >
              <option value="">Select report</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
            <button type="submit">Assign</button>
          </form>
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}
    </section>
  );
}
