import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Payslip } from "../api/types";

export default function PayslipsSection() {
  const { t } = useTranslation();
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
      setError(err instanceof ApiError ? err.message : t("payslips.openFailed"));
    }
  }

  const sorted = [...payslips].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="panel">
      <h2>{t("payslips.title")}</h2>
      <p className="hint">{t("payslips.hint")}</p>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {sorted.map((p) => (
          <li key={p.id}>
            <span>{p.period}</span>
            {p.pdfFilename && (
              <span className="actions">
                <button onClick={() => handleView(p.id)}>{t("payslips.viewPayslip")}</button>
              </span>
            )}
          </li>
        ))}
        {sorted.length === 0 && <li className="empty">{t("payslips.empty")}</li>}
      </ul>
    </section>
  );
}
