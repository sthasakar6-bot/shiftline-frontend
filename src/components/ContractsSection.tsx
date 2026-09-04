import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Contract } from "../api/types";

export default function ContractsSection() {
  const { t } = useTranslation();
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
      setError(err instanceof ApiError ? err.message : t("contracts.openFailed"));
    }
  }

  return (
    <section className="panel">
      <h2>{t("contracts.title")}</h2>
      <p className="hint">{t("contracts.hint")}</p>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {contracts.map((c) => (
          <li key={c.id}>
            <span>{c.role}</span>
            {c.pdfFilename && (
              <span className="actions">
                <button onClick={() => handleView(c.id)}>{t("contracts.viewContract")}</button>
              </span>
            )}
          </li>
        ))}
        {contracts.length === 0 && <li className="empty">{t("contracts.empty")}</li>}
      </ul>
    </section>
  );
}
