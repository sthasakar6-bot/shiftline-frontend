import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest } from "../api/types";
import { formatDateOnly } from "../lib/dateOnly";

export default function LeaveSection() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [type, setType] = useState<"vacation" | "sick">("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listLeaveRequests().then(setRequests).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createLeaveRequest({ type, startDate, endDate, reason: reason || undefined });
      setStartDate("");
      setEndDate("");
      setReason("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request leave");
    }
  }

  async function handleCancel(id: number) {
    try {
      await api.cancelLeaveRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    }
  }

  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="panel">
      <h2>Leave Requests</h2>

      <div className="subform">
        <h3>Request leave</h3>
        <form className="inline-form" onSubmit={handleCreate}>
          <label className="field">
            <span className="field-label">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as "vacation" | "sick")}>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button type="submit">Request</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <ul className="list">
        {sortedRequests.map((r) => (
          <li key={r.id}>
            <span>
              <span className={`type-badge ${r.type}`}>{r.type}</span>{" "}
              <span className={`status-badge ${r.status}`}>{r.status}</span>
              <br />
              {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
              {r.reason && <> · {r.reason}</>}
            </span>
            {r.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCancel(r.id)}>Cancel</button>
              </span>
            )}
          </li>
        ))}
        {sortedRequests.length === 0 && <li className="empty">No leave requests yet.</li>}
      </ul>
    </section>
  );
}
