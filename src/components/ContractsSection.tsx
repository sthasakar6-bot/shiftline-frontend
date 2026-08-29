import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Contract } from "../api/types";

export default function ContractsSection() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listContracts().then(setContracts).catch(() => {});
  }, []);

  async function handleView(contractId: number) {
    setError(null);
    try {
      const blob = await api.getContractPdf(contractId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open contract");
    }
  }

  return (
    <section className="panel">
      <h2>My Contracts</h2>
      <p className="hint">Issued by your manager. Contact them for any changes.</p>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {contracts.map((c) => (
          <li key={c.id}>
            <span>{c.role}</span>
            {c.pdfFilename && (
              <span className="actions">
                <button onClick={() => handleView(c.id)}>View contract</button>
              </span>
            )}
          </li>
        ))}
        {contracts.length === 0 && <li className="empty">No contracts yet.</li>}
      </ul>
    </section>
  );
}
