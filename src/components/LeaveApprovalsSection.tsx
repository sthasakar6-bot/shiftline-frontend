import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Hourglass, Palmtree, CalendarClock, History } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { LeaveRequest, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { fetchAllLeave, type LeaveEntry } from "../lib/aggregateLeave";
import { addDays, formatDateOnly, formatLocalDate, parseIsoDateLocal, todayLocal } from "../lib/dateOnly";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";

export default function LeaveApprovalsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allLeave, setAllLeave] = useState<LeaveEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; id: number; employeeName: string } | null>(
    null,
  );

  const youLabel = `(${t("common.you")})`;

  const people = useMemo(
    () =>
      user
        ? [{ id: user.id, name: `${user.name} ${youLabel}`, hasAvatar: user.hasAvatar }, ...reports]
        : reports,
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(err instanceof ApiError ? err.message : t("leaveApprovals.updateFailed"));
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
      setError(err instanceof ApiError ? err.message : t("leaveApprovals.cancelFailed"));
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
      <h2>{t("leaveApprovals.title")}</h2>
      {error && <div className="error">{error}</div>}

      <div className="leave-group">
        <div className="leave-group-header">
          <Hourglass size={15} />
          <span>{t("leaveApprovals.pendingRequests")}</span>
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
                  {r.employeeName} <span className={`type-badge ${r.type}`}>{t(`leave.${r.type}`)}</span>
                </span>
                <span className="leave-row-dates">
                  {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
                  {r.reason && <> · {r.reason}</>}
                </span>
              </div>
              <span className="actions">
                <button onClick={() => decide(r.userId, r.id, "approved")}>
                  {t("leaveApprovals.approve")}
                </button>
                <button onClick={() => decide(r.userId, r.id, "rejected")}>
                  {t("leaveApprovals.reject")}
                </button>
              </span>
            </li>
          ))}
          {pendingRequests.length === 0 && (
            <li className="leave-empty">{t("leaveApprovals.noPending")}</li>
          )}
        </ul>
      </div>

      <div className="leave-group">
        <div className="leave-group-header">
          <Palmtree size={15} />
          <span>{t("leaveApprovals.onLeaveNow")}</span>
          {onLeaveNow.length > 0 && <span className="leave-group-count">{onLeaveNow.length}</span>}
        </div>
        <ul className="leave-rows">
          {onLeaveNow.map((l) => (
            <li key={l.id} className="leave-row">
              <Avatar userId={l.userId} name={l.employeeName} hasAvatar={l.employeeHasAvatar} size={32} />
              <div className="leave-row-body">
                <span className="leave-row-name">
                  {l.employeeName} <span className={`type-badge ${l.type}`}>{t(`leave.${l.type}`)}</span>
                </span>
                <span className="leave-row-dates">
                  {t("leaveApprovals.back", {
                    date: formatLocalDate(addDays(parseIsoDateLocal(l.endDate), 1)),
                  })}
                </span>
              </div>
              <span className="actions">
                <button
                  onClick={() =>
                    setRevokeTarget({ userId: l.userId, id: l.id, employeeName: l.employeeName })
                  }
                >
                  {t("leaveApprovals.cancel")}
                </button>
              </span>
            </li>
          ))}
          {onLeaveNow.length === 0 && (
            <li className="leave-empty">{t("leaveApprovals.nobodyOnLeave")}</li>
          )}
        </ul>
      </div>

      <div className="leave-group">
        <div className="leave-group-header">
          <CalendarClock size={15} />
          <span>{t("leaveApprovals.upcomingLeave")}</span>
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
                  {l.employeeName} <span className={`type-badge ${l.type}`}>{t(`leave.${l.type}`)}</span>
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
                  {t("leaveApprovals.cancel")}
                </button>
              </span>
            </li>
          ))}
          {upcomingLeave.length === 0 && (
            <li className="leave-empty">{t("leaveApprovals.noUpcoming")}</li>
          )}
        </ul>
      </div>

      <hr className="section-divider" />

      <div className="leave-group-header">
        <History size={15} />
        <span>{t("leaveApprovals.leaveHistory")}</span>
      </div>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("team.selectEmployee")}</option>
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
                  <span className={`type-badge ${r.type}`}>{t(`leave.${r.type}`)}</span>{" "}
                  <span className={`status-badge ${r.status}`}>{t(`leave.${r.status}`)}</span>
                </span>
                <span className="leave-row-dates">
                  {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
                  {r.reason && <> · {r.reason}</>}
                </span>
              </div>
              {r.status === "pending" && (
                <span className="actions">
                  <button onClick={() => decide(Number(selected), r.id, "approved")}>
                    {t("leaveApprovals.approve")}
                  </button>
                  <button onClick={() => decide(Number(selected), r.id, "rejected")}>
                    {t("leaveApprovals.reject")}
                  </button>
                </span>
              )}
              {r.status === "approved" && (
                <span className="actions">
                  <button
                    onClick={() => {
                      const name =
                        people.find((p) => p.id === Number(selected))?.name ?? t("leaveApprovals.them");
                      setRevokeTarget({ userId: Number(selected), id: r.id, employeeName: name });
                    }}
                  >
                    {t("leaveApprovals.cancel")}
                  </button>
                </span>
              )}
            </li>
          ))}
          {requests.length === 0 && <li className="leave-empty">{t("leaveApprovals.noRequests")}</li>}
        </ul>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title={t("leaveApprovals.cancelLeaveQuestion")}
          message={t("leaveApprovals.cancelLeaveMessage", { name: revokeTarget.employeeName })}
          confirmLabel={t("leaveApprovals.cancelLeaveConfirm")}
          danger
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </section>
  );
}
