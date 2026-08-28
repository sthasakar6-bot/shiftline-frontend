import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Contract } from "../api/types";

export default function ContractsSection() {
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    api.listContracts().then(setContracts).catch(() => {});
  }, []);

  return (
    <section className="panel">
      <h2>My Contracts</h2>
      <p className="hint">Issued by your manager. Contact them for any changes.</p>
      <ul className="list">
        {contracts.map((c) => (
          <li key={c.id}>
            <span>
              <strong>{c.title}</strong> — {c.status}
              <br />
              Start: {c.startDate.slice(0, 10)} · End:{" "}
              {c.endDate ? c.endDate.slice(0, 10) : "Not set"}
            </span>
          </li>
        ))}
        {contracts.length === 0 && <li className="empty">No contracts yet.</li>}
      </ul>
    </section>
  );
}
