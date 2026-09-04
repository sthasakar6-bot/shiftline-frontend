import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Palmtree } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import type { Attendance, LeaveRequest, Shift } from "../api/types";
import { formatTime } from "../lib/formatDate";
import { formatLocalDate, parseIsoDateLocal, todayLocal } from "../lib/dateOnly";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function DashboardHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    api.listAttendance().then(setRecords).catch(() => {});
    api.listShifts().then(setShifts).catch(() => {});
    api.listLeaveRequests().then(setLeaveRequests).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function greetingForHour(hour: number): string {
    if (hour < 5) return t("home.goodNight");
    if (hour < 12) return t("home.goodMorning");
    if (hour < 18) return t("home.goodAfternoon");
    return t("home.goodEvening");
  }

  const openRecord = records.find((r) => !r.clockOut);
  const completedShiftIds = new Set(records.filter((r) => r.clockOut).map((r) => r.shiftId));
  const clockableShifts = shifts
    .filter((s) => !completedShiftIds.has(s.id))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const todaysShifts = clockableShifts.filter(
    (s) => new Date(s.startsAt).toDateString() === now.toDateString(),
  );
  const featuredShift = todaysShifts[0] ?? clockableShifts[0];
  const isFeaturedToday = featuredShift
    ? new Date(featuredShift.startsAt).toDateString() === now.toDateString()
    : false;

  const firstName = user?.name.split(" ")[0] ?? "";

  const today = todayLocal();
  const upcomingLeave = leaveRequests
    .filter((l) => l.status === "approved" && parseIsoDateLocal(l.endDate) >= today)
    .sort(
      (a, b) => parseIsoDateLocal(a.startDate).getTime() - parseIsoDateLocal(b.startDate).getTime(),
    );
  const nextLeave = upcomingLeave[0];
  const isLeaveActive = nextLeave ? parseIsoDateLocal(nextLeave.startDate) <= today : false;

  return (
    <>
      {user && (
        <div className="greeting-header">
          <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={56} />
          <div className="greeting-header-text">
            <span className="greeting-line">{greetingForHour(now.getHours())},</span>
            <h2 className="greeting-name">
              {firstName}! <span className="greeting-wave">👋</span>
            </h2>
            {openRecord && (
              <span className="greeting-status-active">
                <span className="presence-dot" /> {t("home.active")}
              </span>
            )}
          </div>
        </div>
      )}

      {openRecord ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">{t("home.currentShift")}</h3>
          <div className="shift-card-date">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="shift-card-row">
            <Clock size={16} />
            <span>
              {t("home.since")} {openRecord.clockIn ? formatTime(openRecord.clockIn) : "--"} ·{" "}
              {formatElapsed(
                now.getTime() -
                  (openRecord.clockIn ? new Date(openRecord.clockIn).getTime() : now.getTime()),
              )}
            </span>
          </div>
          <span className="shift-status-pill in">
            <span className="presence-dot" /> {t("home.clockedIn")}
          </span>
        </section>
      ) : featuredShift ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">
            {isFeaturedToday ? t("home.todaysShift") : t("home.nextShift")}
          </h3>
          <div className="shift-card-date">
            {new Date(featuredShift.startsAt).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="shift-card-row">
            <Clock size={16} />
            <span>
              {formatTime(featuredShift.startsAt)} – {formatTime(featuredShift.endsAt)}
            </span>
          </div>
          <span className="shift-status-pill pending">{t("home.notClockedInYet")}</span>
        </section>
      ) : (
        <p className="hint">{t("home.noUpcomingShifts")}</p>
      )}

      {nextLeave && (
        <section className="panel shift-card">
          <h3 className="shift-card-title">
            {isLeaveActive ? t("home.onLeave") : t("home.upcoming")} ·{" "}
            {nextLeave.type === "sick" ? t("leave.sick") : t("leave.vacation")}
          </h3>
          <div className="shift-card-date">
            {formatLocalDate(parseIsoDateLocal(nextLeave.startDate))} –{" "}
            {formatLocalDate(parseIsoDateLocal(nextLeave.endDate))}
          </div>
          <div className="shift-card-row">
            <Palmtree size={16} />
            <span className={`type-badge ${nextLeave.type}`}>{t(`leave.${nextLeave.type}`)}</span>
            <span className="status-badge approved">{t("leave.approved")}</span>
          </div>
        </section>
      )}
    </>
  );
}
