import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CalendarCheck,
  Clock,
  Palmtree,
  Thermometer,
  Phone,
  Check,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import Avatar from "../components/Avatar";
import ContractsSection from "../components/ContractsSection";
import type { Attendance, LeaveRequest } from "../api/types";
import { parseIsoDateLocal } from "../lib/dateOnly";

function countLeaveDays(l: LeaveRequest): number {
  const start = parseIsoDateLocal(l.startDate);
  const end = parseIsoDateLocal(l.endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  useEffect(() => {
    api.listAttendance().then(setAttendance).catch(() => {});
    api.listLeaveRequests().then(setLeaveRequests).catch(() => {});
  }, []);

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    setError(null);
    try {
      await api.updatePhone(phone);
      await refreshUser();
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save phone number");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

    const thisMonth = attendance.filter((a) => {
      if (!a.clockIn) return false;
      const t = new Date(a.clockIn);
      return t >= monthStart && t < monthEnd;
    });
    const daysWorked = new Set(thisMonth.map((a) => new Date(a.clockIn as string).toDateString()))
      .size;
    const hoursWorked = thisMonth.reduce((sum, a) => {
      if (!a.clockIn || !a.clockOut) return sum;
      return sum + (new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime()) / 3600000;
    }, 0);

    const approvedThisYear = leaveRequests.filter((l) => {
      if (l.status !== "approved") return false;
      const start = parseIsoDateLocal(l.startDate);
      return start >= yearStart && start < yearEnd;
    });
    const vacationDays = approvedThisYear
      .filter((l) => l.type === "vacation")
      .reduce((sum, l) => sum + countLeaveDays(l), 0);
    const sickDays = approvedThisYear
      .filter((l) => l.type === "sick")
      .reduce((sum, l) => sum + countLeaveDays(l), 0);

    return { daysWorked, hoursWorked, vacationDays, sickDays };
  }, [attendance, leaveRequests]);

  if (!user) return null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <h1>Profile</h1>
      </header>

      <main className="app-content">
        <section className="panel profile-card">
          <div className="profile-banner" />
          <div className="profile-body">
            <div className="profile-avatar-wrap">
              <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={88} />
              <button
                className="avatar-edit-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Change photo"
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
            <h2>{user.name}</h2>
            <p className="hint">{user.email}</p>
            <span className="role-badge">{user.role}</span>
            {uploading && <p className="hint">Uploading photo...</p>}

            <form className="profile-phone-form" onSubmit={handleSavePhone}>
              <label className="field">
                <span className="field-label">Phone number</span>
                <div className="profile-phone-row">
                  <Phone size={15} className="profile-phone-icon" />
                  <input
                    type="tel"
                    placeholder="Add a phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </label>
              <button type="submit" disabled={savingPhone}>
                {phoneSaved ? <Check size={15} /> : savingPhone ? "Saving..." : "Save"}
              </button>
            </form>

            {error && <div className="error">{error}</div>}
          </div>
        </section>

        <section className="panel">
          <h3>This month</h3>
          <div className="stat-row">
            <div className="stat-tile">
              <CalendarCheck size={20} className="stat-icon" />
              <div className="stat-value">{stats.daysWorked}</div>
              <div className="stat-label">Days worked</div>
            </div>
            <div className="stat-tile">
              <Clock size={20} className="stat-icon" />
              <div className="stat-value">{stats.hoursWorked.toFixed(1)}</div>
              <div className="stat-label">Hours worked</div>
            </div>
          </div>

          <h3>This year</h3>
          <div className="stat-row">
            <div className="stat-tile">
              <Palmtree size={20} className="stat-icon" />
              <div className="stat-value">{stats.vacationDays}</div>
              <div className="stat-label">Vacation days taken</div>
            </div>
            <div className="stat-tile">
              <Thermometer size={20} className="stat-icon" />
              <div className="stat-value">{stats.sickDays}</div>
              <div className="stat-label">Sick days taken</div>
            </div>
          </div>
        </section>

        <ContractsSection />
      </main>
    </div>
  );
}
