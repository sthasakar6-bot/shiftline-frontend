import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import { formatTime } from "../lib/formatDate";

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

  const people = user ? [{ id: user.id, name: `${user.name} (you)` }, ...reports] : reports;

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

  const groupedByDay = useMemo(() => {
    const inWeek = roster
      .filter((s) => {
        const start = new Date(s.startsAt);
        return start >= weekStart && start < weekEnd;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    const groups = new Map<string, { label: string; shifts: RosterEntry[] }>();
    for (const entry of inWeek) {
      const day = new Date(entry.startsAt);
      const key = dateKey(day);
      if (!groups.has(key)) {
        groups.set(key, {
          label: day.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          shifts: [],
        });
      }
      groups.get(key)!.shifts.push(entry);
    }
    return [...groups.values()];
  }, [roster, weekStart, weekEnd]);

  return (
    <section className="panel">
      <h2>Roster</h2>
      <p className="hint">Who's working, and when. Shown read-only on each employee's own page.</p>

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

      <div className="calendar-header">
        <button
          type="button"
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
        <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          {weekLabel}
        </button>
        <button
          type="button"
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

      {groupedByDay.map((group) => (
        <div key={group.label} className="roster-group">
          <h3>{group.label}</h3>
          <ul className="list">
            {group.shifts.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{s.employeeName}</strong> — {formatTime(s.startsAt)} –{" "}
                  {formatTime(s.endsAt)}
                  {s.breakMinutes && (
                    <>
                      <br />
                      Break: {s.breakMinutes} min
                    </>
                  )}
                </span>
                <span className="actions">
                  <button onClick={() => setRemoveTarget(s)}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {groupedByDay.length === 0 && <p className="hint">No shifts scheduled this week.</p>}

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
