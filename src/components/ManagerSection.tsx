import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreVertical } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";
import EmployeeDetailModal from "./EmployeeDetailModal";
import { SkeletonRows } from "./Skeleton";

const PRESENCE_POLL_MS = 15000;

function TeamRowMenu({
  employee,
  isOwnReport,
  onToggleTeam,
  onRemovePermanently,
}: {
  employee: UserSummary;
  isOwnReport: boolean;
  onToggleTeam: () => void;
  onRemovePermanently: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("team.rowMenu", { name: employee.name })}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="row-menu-list">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleTeam();
            }}
          >
            {isOwnReport ? t("team.removeFromTeam") : t("team.addToTeam")}
          </button>
          <button
            type="button"
            className="row-menu-danger"
            onClick={() => {
              setOpen(false);
              onRemovePermanently();
            }}
          >
            {t("team.removePermanently")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagerSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<UserSummary[]>([]);
  const [removeTarget, setRemoveTarget] = useState<UserSummary | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserSummary | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // Former employees
  const [formerEmployees, setFormerEmployees] = useState<UserSummary[]>([]);
  const [showFormerEmployees, setShowFormerEmployees] = useState(false);
  const [formerLoading, setFormerLoading] = useState(true);

  function loadEmployees() {
    api
      .listEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmployeesLoading(false));
  }

  function loadFormerEmployees() {
    api
      .listFormerEmployees()
      .then(setFormerEmployees)
      .catch(() => {})
      .finally(() => setFormerLoading(false));
  }

  useEffect(loadEmployees, []);
  useEffect(loadFormerEmployees, []);

  useEffect(() => {
    if (detailTargetId === null) return;
    const timer = setInterval(loadEmployees, PRESENCE_POLL_MS);
    return () => clearInterval(timer);
  }, [detailTargetId]);

  const detailTarget = employees.find((e) => e.id === detailTargetId) ?? null;

  async function handleAddToTeam(id: number) {
    setError(null);
    try {
      await api.assignManager(id);
      loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.addFailed"));
    }
  }

  async function handleRemoveFromTeam(id: number) {
    setError(null);
    try {
      await api.removeFromTeam(id);
      loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.removeFailed"));
    } finally {
      setRemoveTarget(null);
    }
  }

  async function handleDeactivate(id: number) {
    setError(null);
    try {
      await api.deactivateEmployee(id);
      loadEmployees();
      loadFormerEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.deactivateFailed"));
    } finally {
      setDeactivateTarget(null);
    }
  }

  async function handleReactivate(id: number) {
    setError(null);
    try {
      await api.reactivateEmployee(id);
      loadEmployees();
      loadFormerEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.reactivateFailed"));
    }
  }

  return (
    <section className="panel">
      <h2>{t("team.title")}</h2>
      <ul className="list">
        {employeesLoading && <SkeletonRows count={4} />}
        {!employeesLoading &&
          employees.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="list-row-identity"
                onClick={() => setDetailTargetId(e.id)}
              >
                <Avatar userId={e.id} name={e.name} hasAvatar={e.hasAvatar} size={32} />
                {e.name}
                {e.online && <span className="presence-dot inline" title={t("team.online")} />}
              </button>
              <TeamRowMenu
                employee={e}
                isOwnReport={e.managerId === user?.id}
                onToggleTeam={() =>
                  e.managerId === user?.id ? setRemoveTarget(e) : handleAddToTeam(e.id)
                }
                onRemovePermanently={() => setDeactivateTarget(e)}
              />
            </li>
          ))}
        {!employeesLoading && employees.length === 0 && (
          <li className="empty">{t("team.empty")}</li>
        )}
      </ul>
      {error && <div className="error">{error}</div>}

      <button
        type="button"
        className="link-btn"
        onClick={() => setShowFormerEmployees((v) => !v)}
      >
        {showFormerEmployees
          ? t("team.hideFormerEmployees")
          : t("team.showFormerEmployees", { count: formerEmployees.length })}
      </button>
      {showFormerEmployees && (
        <ul className="list">
          {formerLoading && <SkeletonRows count={2} avatar={false} />}
          {!formerLoading &&
            formerEmployees.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <span className="actions">
                  <button onClick={() => handleReactivate(e.id)}>{t("team.restore")}</button>
                </span>
              </li>
            ))}
          {!formerLoading && formerEmployees.length === 0 && (
            <li className="empty">{t("team.noFormerEmployees")}</li>
          )}
        </ul>
      )}

      {detailTarget && (
        <EmployeeDetailModal
          employee={detailTarget}
          onClose={() => setDetailTargetId(null)}
          onLocationChanged={loadEmployees}
          onDepartmentChanged={loadEmployees}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title={t("team.removeQuestion")}
          message={t("team.removeConfirmMessage", { name: removeTarget.name })}
          confirmLabel={t("team.remove")}
          danger
          onConfirm={() => handleRemoveFromTeam(removeTarget.id)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title={t("team.removePermanentlyQuestion")}
          message={t("team.removePermanentlyConfirmMessage", { name: deactivateTarget.name })}
          confirmLabel={t("team.removePermanently")}
          danger
          onConfirm={() => handleDeactivate(deactivateTarget.id)}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </section>
  );
}
