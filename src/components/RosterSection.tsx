import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import { formatDateTime, formatTime } from "../lib/formatDate";

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

export default function RosterSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
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
    const now = Date.now();
    try {
      const lists = await Promise.all(
        targets.map((t) =>
          api
            .listShiftsForReport(t.id)
            .then((shifts) => shifts.map((s) => ({ ...s, employeeName: t.name }))),
        ),
      );
      const merged = lists
        .flat()
        .filter((s) => new Date(s.endsAt).getTime() >= now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      setRoster(merged);
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

  const groupedRoster = new Map<string, RosterEntry[]>();
  for (const entry of roster) {
    const group = groupedRoster.get(entry.employeeName) ?? [];
    group.push(entry);
    groupedRoster.set(entry.employeeName, group);
  }

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

      {[...groupedRoster.entries()].map(([employeeName, shifts]) => (
        <div key={employeeName} className="roster-group">
          <h3>{employeeName}</h3>
          <ul className="list">
            {shifts.map((s) => (
              <li key={s.id}>
                <span>
                  {formatDateTime(s.startsAt)} → {formatTime(s.endsAt)}
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
      {roster.length === 0 && <p className="hint">No upcoming shifts scheduled.</p>}

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
