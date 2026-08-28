import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Shift } from "../api/types";

export default function ShiftsSection() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listShifts().then(setShifts).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createShift({ startsAt, endsAt });
      setStartsAt("");
      setEndsAt("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create shift");
    }
  }

  async function handleDelete(id: number) {
    await api.deleteShift(id);
    load();
  }

  return (
    <section className="panel">
      <h2>Shifts</h2>
      <form className="inline-form" onSubmit={handleCreate}>
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
        <button type="submit">Add</button>
      </form>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {shifts.map((s) => (
          <li key={s.id}>
            <span>
              {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}
            </span>
            <span className="actions">
              <button onClick={() => handleDelete(s.id)}>Delete</button>
            </span>
          </li>
        ))}
        {shifts.length === 0 && <li className="empty">No shifts yet.</li>}
      </ul>
    </section>
  );
}
