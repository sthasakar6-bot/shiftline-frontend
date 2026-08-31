import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import type { Attendance, Shift } from "../api/types";
import { formatTime } from "../lib/formatDate";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    api.listAttendance().then(setRecords).catch(() => {});
    api.listShifts().then(setShifts).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
                <span className="presence-dot" /> Active
              </span>
            )}
          </div>
        </div>
      )}

      {openRecord ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">Current Shift</h3>
          <div className="shift-card-date">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="shift-card-row">
            <Clock size={16} />
            <span>
              Since {openRecord.clockIn ? formatTime(openRecord.clockIn) : "--"} ·{" "}
              {formatElapsed(
                now.getTime() -
                  (openRecord.clockIn ? new Date(openRecord.clockIn).getTime() : now.getTime()),
              )}
            </span>
          </div>
          <span className="shift-status-pill in">
            <span className="presence-dot" /> Clocked in
          </span>
        </section>
      ) : featuredShift ? (
        <section className="panel shift-card">
          <h3 className="shift-card-title">{isFeaturedToday ? "Today's Shift" : "Next Shift"}</h3>
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
          <span className="shift-status-pill pending">Not clocked in yet</span>
        </section>
      ) : (
        <p className="hint">No upcoming shifts scheduled yet.</p>
      )}
    </>
  );
}
