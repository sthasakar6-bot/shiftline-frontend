import { useEffect, useMemo, useState } from "react";
import { Hourglass, Palmtree, CalendarClock, History } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { fetchAllLeave, type LeaveEntry } from "../lib/aggregateLeave";
import { addDays, formatDateOnly, formatLocalDate, parseIsoDateLocal, todayLocal } from "../lib/dateOnly";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";

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
    () =>
      user
        ? [{ id: user.id, name: `${user.name} (you)`, hasAvatar: user.hasAvatar }, ...reports]
        : reports,
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
      {error && <div className="error">{error}</div>}

      <div className="leave-group">
        <div className="leave-group-header">
          <Hourglass size={15} />
          <span>Pending requests</span>
          {pendingRequests.length > 0 && (
            <span className="leave-group-count">{pendingRequests.length}</span>
          )}
        </div>
        <ul className="leave-rows">
          {pendingRequests.map((r) => (
            <li key={r.id} className="leave-row">
              <Avatar userId={r.userId} name={r.employeeName} hasAvatar={r.employeeHasAvatar} size={32} />
              <div className="leave-row-body">
                <span className="leave-row-name">
                  {r.employeeName} <span className={`type-badge ${r.type}`}>{r.type}</span>
                </span>
                <span className="leave-row-dates">
                  {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
                  {r.reason && <> · {r.reason}</>}
                </span>
              </div>
              <span className="actions">
                <button onClick={() => decide(r.userId, r.id, "approved")}>Approve</button>
                <button onClick={() => decide(r.userId, r.id, "rejected")}>Reject</button>
              </span>
            </li>
          ))}
          {pendingRequests.length === 0 && <li className="leave-empty">No pending requests.</li>}
        </ul>
      </div>

      <div className="leave-group">
        <div className="leave-group-header">
          <Palmtree size={15} />
          <span>On leave now</span>
          {onLeaveNow.length > 0 && <span className="leave-group-count">{onLeaveNow.length}</span>}
        </div>
        <ul className="leave-rows">
          {onLeaveNow.map((l) => (
            <li key={l.id} className="leave-row">
              <Avatar userId={l.userId} name={l.employeeName} hasAvatar={l.employeeHasAvatar} size={32} />
              <div className="leave-row-body">
                <span className="leave-row-name">
                  {l.employeeName} <span className={`type-badge ${l.type}`}>{l.type}</span>
                </span>
                <span className="leave-row-dates">
                  Back {formatLocalDate(addDays(parseIsoDateLocal(l.endDate), 1))}
                </span>
              </div>
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
          {onLeaveNow.length === 0 && <li className="leave-empty">Nobody is on leave today.</li>}
        </ul>
      </div>

      <div className="leave-group">
        <div className="leave-group-header">
          <CalendarClock size={15} />
          <span>Upcoming leave</span>
          {upcomingLeave.length > 0 && (
            <span className="leave-group-count">{upcomingLeave.length}</span>
          )}
        </div>
        <ul className="leave-rows">
          {upcomingLeave.map((l) => (
            <li key={l.id} className="leave-row">
              <Avatar userId={l.userId} name={l.employeeName} hasAvatar={l.employeeHasAvatar} size={32} />
              <div className="leave-row-body">
                <span className="leave-row-name">
                  {l.employeeName} <span className={`type-badge ${l.type}`}>{l.type}</span>
                </span>
                <span className="leave-row-dates">
                  {formatDateOnly(l.startDate)} → {formatDateOnly(l.endDate)}
                </span>
              </div>
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
          {upcomingLeave.length === 0 && <li className="leave-empty">No upcoming leave scheduled.</li>}
        </ul>
      </div>

      <hr className="section-divider" />

      <div className="leave-group-header">
        <History size={15} />
        <span>Leave history by employee</span>
      </div>
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
        <ul className="leave-rows">
          {requests.map((r) => (
            <li key={r.id} className="leave-row">
              <div className="leave-row-body">
                <span className="leave-row-name">
                  <span className={`type-badge ${r.type}`}>{r.type}</span>{" "}
                  <span className={`status-badge ${r.status}`}>{r.status}</span>
                </span>
                <span className="leave-row-dates">
                  {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
                  {r.reason && <> · {r.reason}</>}
                </span>
              </div>
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
          {requests.length === 0 && <li className="leave-empty">No leave requests.</li>}
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
