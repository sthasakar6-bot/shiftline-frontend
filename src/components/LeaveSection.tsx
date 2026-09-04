import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest } from "../api/types";
import { formatDateOnly } from "../lib/dateOnly";
import DateRangePicker from "./DateRangePicker";

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
      await api.createLeaveRequest({
        type,
        startDate,
        endDate: endDate || startDate,
        reason: reason || undefined,
      });
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
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value as "vacation" | "sick";
                setType(next);
                if (next === "sick" && startDate) setEndDate(startDate);
              }}
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Date{type === "vacation" && "s"}</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              singleDay={type === "sick"}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button type="submit" disabled={!startDate}>
            Request
          </button>
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
