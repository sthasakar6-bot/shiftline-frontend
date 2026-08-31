import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import type { Attendance, Shift } from "../api/types";
import { formatDateTime, formatTime } from "../lib/formatDate";
import { getCurrentCoords } from "../lib/geolocation";
import ConfirmDialog from "./ConfirmDialog";

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

function ClockFace({ now }: { now: Date }) {
  const parts = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);

  return (
    <div className="clock-time">
      {parts.map((part, i) => {
        if (part.type === "literal" && part.value === ":") {
          return (
            <span key={i} className="clock-colon">
              :
            </span>
          );
        }
        if (part.type === "dayPeriod") {
          return (
            <span key={i} className="clock-period">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AttendanceSection() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftId, setShiftId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [confirmAction, setConfirmAction] = useState<"in" | "out" | null>(null);

  function load() {
    api.listAttendance().then(setRecords).catch(() => {});
    api.listShifts().then(setShifts).catch(() => {});
  }

  useEffect(load, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openRecord = records.find((r) => !r.clockOut);
  const pastRecords = records
    .filter((r) => r.id !== openRecord?.id)
    .sort((a, b) => {
      const aTime = a.clockIn ? new Date(a.clockIn).getTime() : 0;
      const bTime = b.clockIn ? new Date(b.clockIn).getTime() : 0;
      return bTime - aTime;
    });
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
  const needsShiftPicker = clockableShifts.length > 1;
  const effectiveShiftId =
    shiftId || (!needsShiftPicker && featuredShift ? String(featuredShift.id) : "");

  function handleClockInClick() {
    if (!effectiveShiftId) return;
    setShiftId(effectiveShiftId);
    setConfirmAction("in");
  }

  async function confirmClockIn() {
    setConfirmAction(null);
    setError(null);
    setBusy(true);
    try {
      const coords = await getCurrentCoords();
      await api.clockIn(Number(effectiveShiftId), coords);
      setShiftId("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock in");
    } finally {
      setBusy(false);
    }
  }

  async function confirmClockOut() {
    if (!openRecord) return;
    setConfirmAction(null);
    setError(null);
    setBusy(true);
    try {
      const coords = await getCurrentCoords();
      await api.clockOut(openRecord.id, coords);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clock out");
    } finally {
      setBusy(false);
    }
  }

  const selectedShift = clockableShifts.find((s) => String(s.id) === effectiveShiftId);
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
            <span className="greeting-status">
              <span className="role-badge">{user.role}</span>
              {openRecord && (
                <span className="greeting-status-active">
                  <span className="presence-dot" /> Clocked in
                </span>
              )}
            </span>
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
          <button
            className="shift-clock-btn out"
            onClick={() => setConfirmAction("out")}
            disabled={busy}
          >
            Clock Out
          </button>
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

          {needsShiftPicker && (
            <select
              className="shift-card-select"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
            >
              <option value="">Select a shift</option>
              {clockableShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDateTime(s.startsAt)}
                </option>
              ))}
            </select>
          )}

          <button
            className="shift-clock-btn in"
            onClick={handleClockInClick}
            disabled={busy || !effectiveShiftId}
          >
            Clock In
          </button>
        </section>
      ) : (
        <p className="hint">No upcoming shifts scheduled yet.</p>
      )}
      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="clock-display">
          <ClockFace now={now} />
          <div className="clock-date">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>

        <h3>History</h3>
        <ul className="list">
          {pastRecords.map((r) => (
            <li key={r.id}>
              <span>
                <strong>
                  {r.clockIn
                    ? new Date(r.clockIn).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "Unknown date"}
                </strong>
                <br />
                {r.clockIn ? formatTime(r.clockIn) : "-"} – {r.clockOut ? formatTime(r.clockOut) : "-"}
                {r.clockIn && r.clockOut && (
                  <>
                    {" "}
                    ·{" "}
                    {formatDuration(new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime())}
                  </>
                )}
              </span>
            </li>
          ))}
          {pastRecords.length === 0 && <li className="empty">No attendance records yet.</li>}
        </ul>
      </section>

      {confirmAction === "in" && (
        <ConfirmDialog
          title="Clock in?"
          message={
            selectedShift
              ? `Clock in to your ${formatDateTime(selectedShift.startsAt)} shift now?`
              : "Clock in now?"
          }
          confirmLabel="Clock In"
          onConfirm={confirmClockIn}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === "out" && (
        <ConfirmDialog
          title="Clock out?"
          message="Are you sure you want to clock out? This will end your current shift."
          confirmLabel="Clock Out"
          danger
          onConfirm={confirmClockOut}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
