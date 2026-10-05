import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Camera, CalendarCheck, Clock, Palmtree, Thermometer, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import Avatar from "../components/Avatar";
import ContractsSection from "../components/ContractsSection";
import PayslipsSection from "../components/PayslipsSection";
import type { Attendance, LeaveRequest } from "../api/types";
import { parseIsoDateLocal } from "../lib/dateOnly";
import { formatDuration } from "../lib/formatDate";

function countLeaveDays(l: LeaveRequest): number {
  const start = parseIsoDateLocal(l.startDate);
  const end = parseIsoDateLocal(l.endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    api.listAttendance().then(setAttendance).catch(() => {});
    api.listLeaveRequests().then(setLeaveRequests).catch(() => {});
  }, []);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("profile.uploadPhotoFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleExportData() {
    setExporting(true);
    setPrivacyError(null);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "shiftline-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPrivacyError(err instanceof ApiError ? err.message : t("profile.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setPrivacyError(null);
    try {
      await api.deleteMyAccount();
      logout();
      navigate("/select-company", { replace: true });
    } catch (err) {
      setPrivacyError(err instanceof ApiError ? err.message : t("profile.deleteFailed"));
      setDeleting(false);
    }
  }

  const selectedMonthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  // Attendance history goes back to whenever the employee's contract
  // started clocking records -- this just bounds the "previous month" arrow
  // so they can't page back past the point where there's nothing to show.
  const earliestAttendanceMonth = useMemo(() => {
    const dates = attendance.filter((a) => a.clockIn).map((a) => new Date(a.clockIn as string));
    if (dates.length === 0) return null;
    const earliest = dates.reduce((min, d) => (d < min ? d : min));
    return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  }, [attendance]);

  const stats = useMemo(() => {
    const monthStart = selectedMonthDate;
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const yearStart = new Date(monthStart.getFullYear(), 0, 1);
    const yearEnd = new Date(monthStart.getFullYear() + 1, 0, 1);

    const monthAttendance = attendance.filter((a) => {
      if (!a.clockIn) return false;
      const t = new Date(a.clockIn);
      return t >= monthStart && t < monthEnd;
    });
    const daysWorked = new Set(monthAttendance.map((a) => new Date(a.clockIn as string).toDateString()))
      .size;
    const workedMs = monthAttendance.reduce((sum, a) => {
      if (!a.clockIn || !a.clockOut) return sum;
      return sum + (new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime());
    }, 0);

    const approvedThatYear = leaveRequests.filter((l) => {
      if (l.status !== "approved") return false;
      const start = parseIsoDateLocal(l.startDate);
      return start >= yearStart && start < yearEnd;
    });
    const vacationDays = approvedThatYear
      .filter((l) => l.type === "vacation")
      .reduce((sum, l) => sum + countLeaveDays(l), 0);
    const sickDays = approvedThatYear
      .filter((l) => l.type === "sick")
      .reduce((sum, l) => sum + countLeaveDays(l), 0);

    return { daysWorked, workedMs, vacationDays, sickDays };
  }, [attendance, leaveRequests, selectedMonthDate]);

  const canGoToNextMonth = monthOffset < 0;
  const canGoToPreviousMonth = !earliestAttendanceMonth || selectedMonthDate > earliestAttendanceMonth;
  const monthLabel = selectedMonthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          {t("common.back")}
        </button>
        <h1>{t("profile.title")}</h1>
      </header>

      <main className="app-content">
        <section className="panel profile-header-card">
          <div className="profile-avatar-wrap">
            <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={72} />
            <button
              className="avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title={t("profile.changePhoto")}
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
          <div className="profile-header-text">
            <h2>{user.name}</h2>
            <span className="role-badge">
              {user.role === "manager" ? t("common.roleManager") : t("common.roleEmployee")}
            </span>
            {uploading && <p className="hint">{t("profile.uploadingPhoto")}</p>}
            {error && <div className="error">{error}</div>}
          </div>
        </section>

        <section className="panel profile-stats-panel">
          <div className="profile-stat-group">
            <div className="profile-month-nav">
              <button
                type="button"
                className="profile-month-nav-btn"
                onClick={() => setMonthOffset((o) => o - 1)}
                disabled={!canGoToPreviousMonth}
                aria-label={t("profile.previousMonth")}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="profile-section-kicker profile-month-label">{monthLabel}</span>
              <button
                type="button"
                className="profile-month-nav-btn"
                onClick={() => setMonthOffset((o) => o + 1)}
                disabled={!canGoToNextMonth}
                aria-label={t("profile.nextMonth")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="profile-stat-grid">
              <div className="profile-stat-card accent">
                <CalendarCheck size={20} />
                <div className="profile-stat-value">{stats.daysWorked}</div>
                <div className="profile-stat-label">{t("profile.daysWorked")}</div>
              </div>
              <div className="profile-stat-card accent-2">
                <Clock size={20} />
                <div className="profile-stat-value">{formatDuration(stats.workedMs)}</div>
                <div className="profile-stat-label">{t("profile.hoursWorked")}</div>
              </div>
            </div>
          </div>

          <div className="profile-stat-group">
            <span className="profile-section-kicker">{t("profile.thisYear")}</span>
            <div className="profile-stat-grid">
              <div className="profile-stat-card success">
                <Palmtree size={20} />
                <div className="profile-stat-value">{stats.vacationDays}</div>
                <div className="profile-stat-label">{t("profile.vacationDaysTaken")}</div>
              </div>
              <div className="profile-stat-card danger">
                <Thermometer size={20} />
                <div className="profile-stat-value">{stats.sickDays}</div>
                <div className="profile-stat-label">{t("profile.sickDaysTaken")}</div>
              </div>
            </div>
          </div>
        </section>

        <ContractsSection />
        <PayslipsSection />

        <section className="panel profile-privacy-panel">
          <h2 className="profile-section-kicker">{t("profile.privacyTitle")}</h2>
          {privacyError && !showDeleteConfirm && <div className="error">{privacyError}</div>}

          <div className="profile-privacy-row">
            <div>
              <p className="profile-privacy-label">{t("profile.exportDataTitle")}</p>
              <p className="hint">{t("profile.exportDataHint")}</p>
            </div>
            <button onClick={handleExportData} disabled={exporting}>
              <Download size={15} />
              {exporting ? t("profile.exporting") : t("profile.exportData")}
            </button>
          </div>
        </section>

        <section className="panel danger-zone-panel">
          <h2 className="danger-zone-title">{t("profile.dangerZoneTitle")}</h2>
          <div className="profile-privacy-row">
            <div>
              <p className="profile-privacy-label">{t("profile.deleteAccountTitle")}</p>
              <p className="hint">
                {user.role === "manager"
                  ? t("profile.deleteAccountHintManager")
                  : t("profile.deleteAccountHint")}
              </p>
            </div>
            <button className="danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={15} />
              {t("profile.deleteAccount")}
            </button>
          </div>
        </section>
      </main>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("profile.deleteAccountTitle")}</h2>
            <p>
              {user.role === "manager"
                ? t("profile.deleteAccountHintManager")
                : t("profile.deleteAccountHint")}
            </p>
            {privacyError && <div className="error">{privacyError}</div>}
            <p>{t("profile.deleteConfirmPrompt")}</p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? t("profile.deleting") : t("profile.deleteAccountConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
