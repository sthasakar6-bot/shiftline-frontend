import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { fetchAllLeave, type LeaveEntry } from "../lib/aggregateLeave";
import { addDays, formatDateOnly, formatLocalDate, parseIsoDateLocal, todayLocal } from "../lib/dateOnly";
import ConfirmDialog from "./ConfirmDialog";

export default function LeaveApprovalsSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allLeave, setAllLeave] = useState<LeaveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; id: number; employeeName: string } | null>(
    null,
  );

  const people = useMemo(
    () => (user ? [{ id: user.id, name: `${user.name} (you)` }, ...reports] : reports),
    [user, reports],
  );

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  function loadOverview() {
    if (people.length > 0) fetchAllLeave(people).then(setAllLeave);
  }

  useEffect(loadOverview, [people]);

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

  async function decide(userId: number, requestId: number, status: "approved" | "rejected") {
    setError(null);
    try {
      await api.decideLeaveRequest(userId, requestId, status);
      if (selected && Number(selected) === userId) load(userId);
      loadOverview();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setError(null);
    try {
      await api.revokeApprovedLeave(revokeTarget.userId, revokeTarget.id);
      if (selected && Number(selected) === revokeTarget.userId) load(revokeTarget.userId);
      loadOverview();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel leave");
    } finally {
      setRevokeTarget(null);
    }
  }

  const today = todayLocal();
  const pendingRequests = allLeave
    .filter((l) => l.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const onLeaveNow = allLeave
    .filter(
      (l) =>
        l.status === "approved" &&
        parseIsoDateLocal(l.startDate) <= today &&
        parseIsoDateLocal(l.endDate) >= today,
    )
    .sort((a, b) => parseIsoDateLocal(a.endDate).getTime() - parseIsoDateLocal(b.endDate).getTime());
  const upcomingLeave = allLeave
    .filter((l) => l.status === "approved" && parseIsoDateLocal(l.startDate) > today)
    .sort(
      (a, b) => parseIsoDateLocal(a.startDate).getTime() - parseIsoDateLocal(b.startDate).getTime(),
    );

  return (
    <section className="panel">
      <h2>Leave Approvals</h2>

      <h3>Pending requests</h3>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {pendingRequests.map((r) => (
          <li key={r.id}>
            <span>
              <strong>{r.employeeName}</strong> <span className={`type-badge ${r.type}`}>{r.type}</span>
              <br />
              {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
              {r.reason && <> · {r.reason}</>}
            </span>
            <span className="actions">
              <button onClick={() => decide(r.userId, r.id, "approved")}>Approve</button>
              <button onClick={() => decide(r.userId, r.id, "rejected")}>Reject</button>
            </span>
          </li>
        ))}
        {pendingRequests.length === 0 && <li className="empty">No pending requests.</li>}
      </ul>

      <h3>On leave now</h3>
      <ul className="list">
        {onLeaveNow.map((l) => (
          <li key={l.id}>
            <span>
              <strong>{l.employeeName}</strong> <span className={`type-badge ${l.type}`}>{l.type}</span>
              <br />
              Back {formatLocalDate(addDays(parseIsoDateLocal(l.endDate), 1))}
            </span>
            <span className="actions">
              <button
                onClick={() =>
                  setRevokeTarget({ userId: l.userId, id: l.id, employeeName: l.employeeName })
                }
              >
                Cancel
              </button>
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
            <span className="actions">
              <button
                onClick={() =>
                  setRevokeTarget({ userId: l.userId, id: l.id, employeeName: l.employeeName })
                }
              >
                Cancel
              </button>
            </span>
          </li>
        ))}
        {upcomingLeave.length === 0 && <li className="empty">No upcoming leave scheduled.</li>}
      </ul>

      <hr className="section-divider" />

      <h3>Leave history by employee</h3>
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
                  <button onClick={() => decide(Number(selected), r.id, "approved")}>Approve</button>
                  <button onClick={() => decide(Number(selected), r.id, "rejected")}>Reject</button>
                </span>
              )}
              {r.status === "approved" && (
                <span className="actions">
                  <button
                    onClick={() => {
                      const name = people.find((p) => p.id === Number(selected))?.name ?? "them";
                      setRevokeTarget({ userId: Number(selected), id: r.id, employeeName: name });
                    }}
                  >
                    Cancel
                  </button>
                </span>
              )}
            </li>
          ))}
          {requests.length === 0 && <li className="empty">No leave requests.</li>}
        </ul>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="Cancel this leave?"
          message={`${revokeTarget.employeeName} will no longer be marked as on approved leave for this period, and their shifts can be scheduled normally again.`}
          confirmLabel="Cancel Leave"
          danger
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </section>
  );
}
