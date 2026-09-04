import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Payslip } from "../api/types";

export default function PayslipsSection() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listPayslips().then(setPayslips).catch(() => {});
  }, []);

  async function handleView(payslipId: number) {
    setError(null);
    try {
      const blob = await api.getPayslipPdf(payslipId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open payslip");
    }
  }

  const sorted = [...payslips].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="panel">
      <h2>My Payslips</h2>
      <p className="hint">Issued by your manager. Contact them for any questions.</p>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {sorted.map((p) => (
          <li key={p.id}>
            <span>{p.period}</span>
            {p.pdfFilename && (
              <span className="actions">
                <button onClick={() => handleView(p.id)}>View payslip</button>
              </span>
            )}
          </li>
        ))}
        {sorted.length === 0 && <li className="empty">No payslips yet.</li>}
      </ul>
    </section>
  );
}
