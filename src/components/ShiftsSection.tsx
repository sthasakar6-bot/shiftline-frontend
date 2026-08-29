import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import type { Attendance, Shift } from "../api/types";
import { formatTime } from "../lib/formatDate";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ShiftsSection() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    api.listShifts().then(setShifts).catch(() => {});
    api.listAttendance().then(setAttendance).catch(() => {});
  }, []);

  const completedShiftIds = useMemo(
    () => new Set(attendance.filter((a) => a.clockOut).map((a) => a.shiftId)),
    [attendance],
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const key = dateKey(new Date(s.startsAt));
      const existing = map.get(key) ?? [];
      existing.push(s);
      map.set(key, existing);
    }
    return map;
  }, [shifts]);

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    const result: (Date | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) result.push(null);
    for (let day = 1; day <= daysInMonth; day++) result.push(new Date(year, month, day));
    return result;
  }, [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedShifts = selectedDay ? (shiftsByDay.get(dateKey(selectedDay)) ?? []) : [];

  return (
    <section className="panel">
      <h2>My Roster</h2>
      <p className="hint">Set by your manager. Contact them for any changes.</p>

      <div className="calendar-header">
        <button
          type="button"
          onClick={() =>
            setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={18} />
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          onClick={() =>
            setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} className="calendar-day empty" />;
          const dayShifts = shiftsByDay.get(dateKey(day)) ?? [];
          const hasShift = dayShifts.length > 0;
          const hasActiveShift = dayShifts.some((s) => !completedShiftIds.has(s.id));
          const isToday = dateKey(day) === dateKey(new Date());
          return (
            <button
              type="button"
              key={dateKey(day)}
              className={`calendar-day${isToday ? " today" : ""}`}
              onClick={() => hasShift && setSelectedDay(day)}
              disabled={!hasShift}
            >
              {day.getDate()}
              {hasActiveShift && <span className="calendar-dot" />}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedDay.toLocaleDateString(undefined, { dateStyle: "full" })}</h3>
            {selectedShifts.map((s) => (
              <p key={s.id}>
                Shift: {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                {s.breakMinutes && (
                  <>
                    <br />
                    Break: {s.breakMinutes} min
                  </>
                )}
              </p>
            ))}
            <div className="modal-actions">
              <button onClick={() => setSelectedDay(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
