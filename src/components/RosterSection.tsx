import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";
import { formatTime, compactTime } from "../lib/formatDate";

interface RosterEntry extends Shift {
  employeeName: string;
}

const BREAK_OPTIONS = [
  { label: "No break", value: "" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "1 hour", value: "60" },
];

// datetime-local gives a plain string with no timezone (e.g. "2026-09-01T09:00")
// -- interpreting it via `new Date(...)` reads it as the browser's local time,
// and toISOString() converts that to the correct UTC instant to send, instead
// of the server assuming UTC for the naive string and silently shifting it.
function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function RosterSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [assignee, setAssignee] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [removeTarget, setRemoveTarget] = useState<RosterEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const people = useMemo(
    () =>
      user
        ? [{ id: user.id, name: `${user.name} (you)`, hasAvatar: user.hasAvatar }, ...reports]
        : reports,
    [user, reports],
  );

  function loadReports() {
    api.listReports().then(setReports).catch(() => {});
  }

  async function loadRoster() {
    if (!user) return;
    const targets = [{ id: user.id, name: `${user.name} (you)` }, ...reports];
    try {
      const lists = await Promise.all(
        targets.map((t) =>
          api
            .listShiftsForReport(t.id)
            .then((shifts) => shifts.map((s) => ({ ...s, employeeName: t.name }))),
        ),
      );
      setRoster(lists.flat());
    } catch {
      // ignore, keep last known roster
    }
  }

  useEffect(loadReports, []);
  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, user]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.createShiftForReport(Number(assignee), {
        startsAt: toIso(startsAt),
        endsAt: toIso(endsAt),
        breakMinutes: breakMinutes ? Number(breakMinutes) : undefined,
      });
      setStartsAt("");
      setEndsAt("");
      setBreakMinutes("");
      setMessage("Shift assigned.");
      loadRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign shift");
    }
  }

  async function handleRemove(entry: RosterEntry) {
    setError(null);
    try {
      await api.deleteShiftForReport(entry.userId, entry.id);
      loadRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove shift");
    } finally {
      setRemoveTarget(null);
    }
  }

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const shiftsByPersonAndDay = useMemo(() => {
    const map = new Map<string, RosterEntry[]>();
    for (const s of roster) {
      const start = new Date(s.startsAt);
      if (start >= weekStart && start < weekEnd) {
        const key = `${s.userId}_${dateKey(start)}`;
        const existing = map.get(key) ?? [];
        existing.push(s);
        map.set(key, existing);
      }
    }
    return map;
  }, [roster, weekStart, weekEnd]);

  const shiftsThisWeek = [...shiftsByPersonAndDay.values()].reduce(
    (sum, list) => sum + list.length,
    0,
  );

  const today = dateKey(new Date());

  return (
    <section className="panel">
      <h2>Roster</h2>

      <div className="subform">
        <h3>Assign a shift</h3>
        <form className="inline-form" onSubmit={handleAssign}>
          <label className="field">
            <span className="field-label">Employee</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
              <option value="">Select employee</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Shift starts</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Shift ends</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Break</span>
            <select value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)}>
              {BREAK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Assign</button>
        </form>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="roster-week-nav">
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() - 7);
              return d;
            })
          }
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="roster-week-label"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          {weekLabel}
        </button>
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() + 7);
              return d;
            })
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {people.length === 0 ? (
        <p className="empty-state">No employees on your team yet.</p>
      ) : shiftsThisWeek === 0 ? (
        <p className="empty-state">No shifts scheduled this week.</p>
      ) : (
        <div className="roster-grid-wrap">
          <table className="roster-grid">
            <thead>
              <tr>
                <th className="roster-grid-corner" />
                {weekDays.map((d) => (
                  <th
                    key={dateKey(d)}
                    className={dateKey(d) === today ? "today" : ""}
                  >
                    <span className="roster-grid-day-name">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="roster-grid-day-num">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <th className="roster-grid-person">
                    <span className="roster-grid-person-inner">
                      <Avatar userId={p.id} name={p.name} hasAvatar={p.hasAvatar} size={26} />
                      <span className="roster-grid-person-name">{p.name}</span>
                    </span>
                  </th>
                  {weekDays.map((d) => {
                    const cellShifts = shiftsByPersonAndDay.get(`${p.id}_${dateKey(d)}`) ?? [];
                    return (
                      <td key={dateKey(d)} className={dateKey(d) === today ? "today" : ""}>
                        {cellShifts.map((s) => (
                          <button
                            key={s.id}
                            className="roster-grid-chip"
                            onClick={() => setRemoveTarget(s)}
                            title={`${formatTime(s.startsAt)} – ${formatTime(s.endsAt)}${s.breakMinutes ? ` · ${s.breakMinutes} min break` : ""}`}
                          >
                            {compactTime(s.startsAt)}-{compactTime(s.endsAt)}
                          </button>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove this shift?"
          message={`Remove ${removeTarget.employeeName}'s shift on ${new Date(removeTarget.startsAt).toLocaleDateString()}?`}
          confirmLabel="Remove"
          danger
          onConfirm={() => handleRemove(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </section>
  );
}
