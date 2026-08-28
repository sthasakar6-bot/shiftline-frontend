import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Shift } from "../api/types";

export default function ShiftsSection() {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    api.listShifts().then(setShifts).catch(() => {});
  }, []);

  return (
    <section className="panel">
      <h2>My Roster</h2>
      <p className="hint">Set by your manager. Contact them for any changes.</p>
      <ul className="list">
        {shifts.map((s) => (
          <li key={s.id}>
            <span>
              {new Date(s.startsAt).toLocaleString()} → {new Date(s.endsAt).toLocaleString()}
            </span>
          </li>
        ))}
        {shifts.length === 0 && <li className="empty">No shifts scheduled yet.</li>}
      </ul>
    </section>
  );
}
