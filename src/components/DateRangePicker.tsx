import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { parseIsoDateLocal, toIsoDateOnly, todayLocal } from "../lib/dateOnly";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatRangeLabel(startIso: string, endIso: string): string {
  const start = parseIsoDateLocal(startIso);
  const end = parseIsoDateLocal(endIso);
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return startIso === endIso ? `${startLabel}, ${end.getFullYear()}` : `${startLabel} – ${endLabel}`;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = startDate ? parseIsoDateLocal(startDate) : todayLocal();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (open) {
      setPendingStart(null);
      const base = startDate ? parseIsoDateLocal(startDate) : todayLocal();
      setMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [open, startDate]);

  const start = startDate ? parseIsoDateLocal(startDate) : null;
  const end = endDate ? parseIsoDateLocal(endDate) : null;

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

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function handlePick(day: Date) {
    if (!pendingStart) {
      setPendingStart(day);
      onChange(toIsoDateOnly(day), toIsoDateOnly(day));
      return;
    }
    if (day.getTime() < pendingStart.getTime()) {
      setPendingStart(day);
      onChange(toIsoDateOnly(day), toIsoDateOnly(day));
      return;
    }
    onChange(toIsoDateOnly(pendingStart), toIsoDateOnly(day));
    setPendingStart(null);
    setOpen(false);
  }

  const label =
    startDate && endDate
      ? formatRangeLabel(startDate, endDate)
      : "Select date or date range";

  return (
    <>
      <button
        type="button"
        className="date-range-trigger"
        onClick={() => setOpen(true)}
      >
        <CalendarDays size={15} />
        <span className={startDate ? "" : "date-range-placeholder"}>{label}</span>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal date-range-modal" onClick={(e) => e.stopPropagation()}>
            <p className="hint date-range-hint">
              {pendingStart ? "Tap the last day of your leave" : "Tap the first day of your leave"}
            </p>

            <div className="roster-week-nav">
              <button
                type="button"
                className="roster-nav-btn"
                onClick={() =>
                  setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
                }
              >
                <ChevronLeft size={18} />
              </button>
              <span className="roster-week-label">{monthLabel}</span>
              <button
                type="button"
                className="roster-nav-btn"
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
                const time = day.getTime();
                const isStart = start && time === start.getTime();
                const isEnd = end && time === end.getTime();
                const inRange = start && end && time > start.getTime() && time < end.getTime();
                const isToday = time === todayLocal().getTime();
                return (
                  <button
                    type="button"
                    key={time}
                    className={`calendar-day${isToday ? " today" : ""}${isStart || isEnd ? " range-endpoint" : ""}${inRange ? " in-range" : ""}`}
                    onClick={() => handlePick(day)}
                  >
                    <span className="calendar-day-num">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
