import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Contract, Payslip, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function PayrollSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Contract management
  const [contractReport, setContractReport] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [role, setRole] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [reuploadFiles, setReuploadFiles] = useState<Record<number, File | null>>({});

  // Payslip management
  const [payslipReport, setPayslipReport] = useState("");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [period, setPeriod] = useState("");
  const [payslipPdfFile, setPayslipPdfFile] = useState<File | null>(null);
  const [payslipReuploadFiles, setPayslipReuploadFiles] = useState<Record<number, File | null>>({});

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  function loadContracts(userId: number) {
    api.listContractsForReport(userId).then(setContracts).catch(() => {});
  }

  useEffect(() => {
    if (contractReport) {
      loadContracts(Number(contractReport));
    } else {
      setContracts([]);
    }
  }, [contractReport]);

  async function handleCreateContract(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const userId = Number(contractReport);
      const contract = await api.createContractForReport(userId, { role });
      if (pdfFile) {
        await api.uploadContractPdfForReport(userId, contract.id, pdfFile);
      }
      setRole("");
      setPdfFile(null);
      loadContracts(userId);
      setMessage(t("team.contractCreated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.createContractFailed"));
    }
  }

  async function handleUploadPdf(contractId: number) {
    const userId = Number(contractReport);
    const file = reuploadFiles[contractId];
    if (!file) return;
    setError(null);
    try {
      await api.uploadContractPdfForReport(userId, contractId, file);
      setReuploadFiles({ ...reuploadFiles, [contractId]: null });
      loadContracts(userId);
      setMessage(t("team.contractPdfUploaded"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.uploadPdfFailed"));
    }
  }

  async function handleViewPdf(contractId: number) {
    const userId = Number(contractReport);
    setError(null);
    try {
      const blob = await api.getContractPdfForReport(userId, contractId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("contracts.openFailed"));
    }
  }

  async function handleDeleteContract(contractId: number) {
    const userId = Number(contractReport);
    await api.deleteContractForReport(userId, contractId);
    loadContracts(userId);
  }

  function loadPayslips(userId: number) {
    api.listPayslipsForReport(userId).then(setPayslips).catch(() => {});
  }

  useEffect(() => {
    if (payslipReport) {
      loadPayslips(Number(payslipReport));
    } else {
      setPayslips([]);
    }
  }, [payslipReport]);

  async function handleCreatePayslip(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const userId = Number(payslipReport);
      const payslip = await api.createPayslipForReport(userId, { period });
      if (payslipPdfFile) {
        await api.uploadPayslipPdfForReport(userId, payslip.id, payslipPdfFile);
      }
      setPeriod("");
      setPayslipPdfFile(null);
      loadPayslips(userId);
      setMessage(t("team.payslipCreated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.createPayslipFailed"));
    }
  }

  async function handleUploadPayslipPdf(payslipId: number) {
    const userId = Number(payslipReport);
    const file = payslipReuploadFiles[payslipId];
    if (!file) return;
    setError(null);
    try {
      await api.uploadPayslipPdfForReport(userId, payslipId, file);
      setPayslipReuploadFiles({ ...payslipReuploadFiles, [payslipId]: null });
      loadPayslips(userId);
      setMessage(t("team.payslipPdfUploaded"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.uploadPdfFailed"));
    }
  }

  async function handleViewPayslipPdf(payslipId: number) {
    const userId = Number(payslipReport);
    setError(null);
    try {
      const blob = await api.getPayslipPdfForReport(userId, payslipId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("payslips.openFailed"));
    }
  }

  async function handleDeletePayslip(payslipId: number) {
    const userId = Number(payslipReport);
    await api.deletePayslipForReport(userId, payslipId);
    loadPayslips(userId);
  }

  return (
    <section className="panel">
      <h2>{t("team.payrollTitle")}</h2>

      <h3>{t("team.manageContracts")}</h3>
      <div className="inline-form">
        <select value={contractReport} onChange={(e) => setContractReport(e.target.value)}>
          <option value="">{t("team.selectEmployee")}</option>
          {user && (
            <option value={user.id}>
              {user.name} ({t("common.you")})
            </option>
          )}
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {contractReport && (
        <>
          <ul className="list">
            {contracts.map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{c.role}</strong>
                  {!c.pdfFilename && ` — ${t("team.noPdfUploaded")}`}
                </span>
                <span className="actions">
                  {c.pdfFilename && (
                    <button onClick={() => handleViewPdf(c.id)}>{t("team.viewPdf")}</button>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                      setReuploadFiles({
                        ...reuploadFiles,
                        [c.id]: e.target.files?.[0] ?? null,
                      })
                    }
                  />
                  <button onClick={() => handleUploadPdf(c.id)}>
                    {c.pdfFilename ? t("team.replacePdf") : t("team.uploadPdf")}
                  </button>
                  <button onClick={() => handleDeleteContract(c.id)}>{t("common.delete")}</button>
                </span>
              </li>
            ))}
            {contracts.length === 0 && <li className="empty">{t("team.noContracts")}</li>}
          </ul>

          <form className="inline-form" onSubmit={handleCreateContract}>
            <input
              placeholder={t("team.role")}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit">{t("team.createContract")}</button>
          </form>

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}

      <h3>{t("team.managePayslips")}</h3>
      <div className="inline-form">
        <select value={payslipReport} onChange={(e) => setPayslipReport(e.target.value)}>
          <option value="">{t("team.selectEmployee")}</option>
          {user && (
            <option value={user.id}>
              {user.name} ({t("common.you")})
            </option>
          )}
          {reports.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {payslipReport && (
        <>
          <ul className="list">
            {payslips.map((p) => (
              <li key={p.id}>
                <span>
                  <strong>{p.period}</strong>
                  {!p.pdfFilename && ` — ${t("team.noPdfUploaded")}`}
                </span>
                <span className="actions">
                  {p.pdfFilename && (
                    <button onClick={() => handleViewPayslipPdf(p.id)}>{t("team.viewPdf")}</button>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                      setPayslipReuploadFiles({
                        ...payslipReuploadFiles,
                        [p.id]: e.target.files?.[0] ?? null,
                      })
                    }
                  />
                  <button onClick={() => handleUploadPayslipPdf(p.id)}>
                    {p.pdfFilename ? t("team.replacePdf") : t("team.uploadPdf")}
                  </button>
                  <button onClick={() => handleDeletePayslip(p.id)}>{t("common.delete")}</button>
                </span>
              </li>
            ))}
            {payslips.length === 0 && <li className="empty">{t("team.noPayslips")}</li>}
          </ul>

          <form className="inline-form" onSubmit={handleCreatePayslip}>
            <input
              placeholder={t("team.payPeriod")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPayslipPdfFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit">{t("team.createPayslip")}</button>
          </form>

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}
    </section>
  );
}
