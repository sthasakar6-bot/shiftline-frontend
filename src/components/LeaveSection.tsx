import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest } from "../api/types";

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

  return (
    <section className="panel">
      <h2>Leave Requests</h2>
      <form className="inline-form" onSubmit={handleCreate}>
        <select value={type} onChange={(e) => setType(e.target.value as "vacation" | "sick")}>
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          title="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          title="End date"
        />
        <input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button type="submit">Request</button>
      </form>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {requests.map((r) => (
          <li key={r.id}>
            <span>
              <strong>{r.type}</strong> — {r.status}
              <br />
              {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}
              {r.reason && <> · {r.reason}</>}
            </span>
            {r.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCancel(r.id)}>Cancel</button>
              </span>
            )}
          </li>
        ))}
        {requests.length === 0 && <li className="empty">No leave requests yet.</li>}
      </ul>
    </section>
  );
}
