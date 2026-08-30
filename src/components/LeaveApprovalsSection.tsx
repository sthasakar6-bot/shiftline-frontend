import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { fetchApprovedLeave, type LeaveEntry } from "../lib/aggregateLeave";
import { addDays, formatDateOnly, formatLocalDate, parseIsoDateLocal, todayLocal } from "../lib/dateOnly";

export default function LeaveApprovalsSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [approvedLeave, setApprovedLeave] = useState<LeaveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const people = useMemo(
    () => (user ? [{ id: user.id, name: `${user.name} (you)` }, ...reports] : reports),
    [user, reports],
  );

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  function loadApprovedLeave() {
    if (people.length > 0) fetchApprovedLeave(people).then(setApprovedLeave);
  }

  useEffect(loadApprovedLeave, [people]);

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
      loadApprovedLeave();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    }
  }

  const today = todayLocal();
  const onLeaveNow = approvedLeave
    .filter(
      (l) => parseIsoDateLocal(l.startDate) <= today && parseIsoDateLocal(l.endDate) >= today,
    )
    .sort((a, b) => parseIsoDateLocal(a.endDate).getTime() - parseIsoDateLocal(b.endDate).getTime());
  const upcomingLeave = approvedLeave
    .filter((l) => parseIsoDateLocal(l.startDate) > today)
    .sort(
      (a, b) => parseIsoDateLocal(a.startDate).getTime() - parseIsoDateLocal(b.startDate).getTime(),
    );

  return (
    <section className="panel">
      <h2>Leave Approvals</h2>

      <h3>On leave now</h3>
      <ul className="list">
        {onLeaveNow.map((l) => (
          <li key={l.id}>
            <span>
              <strong>{l.employeeName}</strong> <span className={`type-badge ${l.type}`}>{l.type}</span>
              <br />
              Back {formatLocalDate(addDays(parseIsoDateLocal(l.endDate), 1))}
            </span>
          </li>
        ))}
        {onLeaveNow.length === 0 && <li className="empty">Nobody is on leave today.</li>}
      </ul>

      <h3>Upcoming leave</h3>
      <ul className="list">
        {upcomingLeave.map((l) => (
          <li key={l.id}>
            <span>
              <strong>{l.employeeName}</strong> <span className={`type-badge ${l.type}`}>{l.type}</span>
              <br />
              {formatDateOnly(l.startDate)} → {formatDateOnly(l.endDate)}
            </span>
          </li>
        ))}
        {upcomingLeave.length === 0 && <li className="empty">No upcoming leave scheduled.</li>}
      </ul>

      <hr className="section-divider" />

      <h3>Review requests</h3>
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
                <span className={`type-badge ${r.type}`}>{r.type}</span>{" "}
                <span className={`status-badge ${r.status}`}>{r.status}</span>
                <br />
                {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
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
