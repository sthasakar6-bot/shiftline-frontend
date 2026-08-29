import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function LeaveApprovalsSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const people = user ? [{ id: user.id, name: `${user.name} (you)` }, ...reports] : reports;

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  function load(userId: number) {
    api.listLeaveRequestsForReport(userId).then(setRequests).catch(() => {});
  }

  useEffect(() => {
    if (selected) {
      load(Number(selected));
    } else {
      setRequests([]);
    }
  }, [selected]);

  async function decide(requestId: number, status: "approved" | "rejected") {
    setError(null);
    try {
      await api.decideLeaveRequest(Number(selected), requestId, status);
      load(Number(selected));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    }
  }

  return (
    <section className="panel">
      <h2>Leave Approvals</h2>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select employee</option>
          {people.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {selected && (
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
                  <button onClick={() => decide(r.id, "approved")}>Approve</button>
                  <button onClick={() => decide(r.id, "rejected")}>Reject</button>
                </span>
              )}
            </li>
          ))}
          {requests.length === 0 && <li className="empty">No leave requests.</li>}
        </ul>
      )}
    </section>
  );
}
