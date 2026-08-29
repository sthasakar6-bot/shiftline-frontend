import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";

interface RosterEntry extends Shift {
  employeeName: string;
}

export default function RosterSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [assignee, setAssignee] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
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
      // datetime-local gives a plain string with no timezone (e.g.
      // "2026-09-01T09:00") -- interpreting it via `new Date(...)` reads it
      // as the browser's local time, and toISOString() converts that to the
      // correct UTC instant to send, instead of the server assuming UTC for
      // the naive string and silently shifting the actual time.
      await api.createShiftForReport(Number(assignee), {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setStartsAt("");
      setEndsAt("");
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

  return (
    <section className="panel">
      <h2>Roster</h2>
      <p className="hint">Who's working, and when. Shown read-only on each employee's own page.</p>

      <form className="inline-form" onSubmit={handleAssign}>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
          <option value="">Select employee</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          required
        />
        <button type="submit">Assign</button>
      </form>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <ul className="list">
        {roster.map((s) => (
          <li key={s.id}>
            <span>
              <strong>{s.employeeName}</strong>
              <br />
              {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}
            </span>
            <span className="actions">
              <button onClick={() => setRemoveTarget(s)}>Remove</button>
            </span>
          </li>
        ))}
        {roster.length === 0 && <li className="empty">No upcoming shifts scheduled.</li>}
      </ul>

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
