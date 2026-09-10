import { type ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Receipt } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { BookkeeperEmployee } from "../api/types";
import LanguageSwitcher from "../components/LanguageSwitcher";
import UserBox from "../components/UserBox";
import { SkeletonRows } from "../components/Skeleton";

export default function BookkeeperPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<BookkeeperEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [payslipPeriod, setPayslipPeriod] = useState("");
  const [payslipFiles, setPayslipFiles] = useState<Record<number, File | null>>({});
  const [uploadingPayslips, setUploadingPayslips] = useState(false);

  const [contractRoles, setContractRoles] = useState<Record<number, string>>({});
  const [contractFiles, setContractFiles] = useState<Record<number, File | null>>({});
  const [uploadingContracts, setUploadingContracts] = useState(false);

  function load() {
    api
      .listBookkeeperEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handlePayslipFileChange(employeeId: number, e: ChangeEvent<HTMLInputElement>) {
    setPayslipFiles({ ...payslipFiles, [employeeId]: e.target.files?.[0] ?? null });
  }

  function handleContractFileChange(employeeId: number, e: ChangeEvent<HTMLInputElement>) {
    setContractFiles({ ...contractFiles, [employeeId]: e.target.files?.[0] ?? null });
  }

  const payslipTargets = employees.filter((e) => payslipFiles[e.id]);
  const contractTargets = employees.filter((e) => contractFiles[e.id] && contractRoles[e.id]?.trim());

  async function handleUploadPayslips() {
    if (!payslipPeriod.trim() || payslipTargets.length === 0) return;
    setError(null);
    setMessage(null);
    setUploadingPayslips(true);
    try {
      for (const employee of payslipTargets) {
        const file = payslipFiles[employee.id];
        if (!file) continue;
        const payslip = await api.createBookkeeperPayslip(employee.id, { period: payslipPeriod.trim() });
        await api.uploadBookkeeperPayslipPdf(employee.id, payslip.id, file);
      }
      setMessage(t("bookkeeper.payslipsUploaded", { count: payslipTargets.length }));
      setPayslipFiles({});
      setPayslipPeriod("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("bookkeeper.payslipUploadFailed"));
    } finally {
      setUploadingPayslips(false);
    }
  }

  async function handleUploadContracts() {
    if (contractTargets.length === 0) return;
    setError(null);
    setMessage(null);
    setUploadingContracts(true);
    try {
      for (const employee of contractTargets) {
        const file = contractFiles[employee.id];
        const role = contractRoles[employee.id];
        if (!file || !role?.trim()) continue;
        const contract = await api.createBookkeeperContract(employee.id, { role: role.trim() });
        await api.uploadBookkeeperContractPdf(employee.id, contract.id, file);
      }
      setMessage(t("bookkeeper.contractsUploaded", { count: contractTargets.length }));
      setContractFiles({});
      setContractRoles({});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("bookkeeper.contractUploadFailed"));
    } finally {
      setUploadingContracts(false);
    }
  }

  async function handleViewContractPdf(employeeId: number, contractId: number) {
    try {
      const blob = await api.getBookkeeperContractPdf(employeeId, contractId);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      setError(t("bookkeeper.viewFailed"));
    }
  }

  async function handleViewPayslipPdf(employeeId: number, payslipId: number) {
    try {
      const blob = await api.getBookkeeperPayslipPdf(employeeId, payslipId);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      setError(t("bookkeeper.viewFailed"));
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{t("bookkeeper.title")}</h1>
        <div className="app-header-actions">
          <LanguageSwitcher />
          <UserBox />
        </div>
      </header>

      <main className="app-content">
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <section className="panel">
          <div className="panel-title">
            <span className="panel-title-icon">
              <Receipt size={17} />
            </span>
            <h2>{t("bookkeeper.uploadPayslips")}</h2>
          </div>
          <p className="hint">{t("bookkeeper.uploadPayslipsHint")}</p>
          <label className="field">
            <span className="field-label">{t("team.payPeriod")}</span>
            <input
              value={payslipPeriod}
              onChange={(e) => setPayslipPeriod(e.target.value)}
              placeholder={t("team.payPeriod")}
            />
          </label>
          {loading ? (
            <SkeletonRows count={3} avatar={false} />
          ) : (
            <ul className="list">
              {employees.map((e) => (
                <li key={e.id}>
                  <span>
                    {e.name}
                    <br />
                    <span className="hint">
                      {t("bookkeeper.hoursThisMonth", { hours: e.hoursThisMonth })}
                    </span>
                  </span>
                  <span className="actions">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(ev) => handlePayslipFileChange(e.id, ev)}
                    />
                  </span>
                </li>
              ))}
              {employees.length === 0 && <li className="empty">{t("bookkeeper.noEmployees")}</li>}
            </ul>
          )}
          <button
            type="button"
            onClick={handleUploadPayslips}
            disabled={uploadingPayslips || !payslipPeriod.trim() || payslipTargets.length === 0}
          >
            {uploadingPayslips
              ? t("bookkeeper.uploading")
              : t("bookkeeper.uploadForCount", { count: payslipTargets.length })}
          </button>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span className="panel-title-icon">
              <FileText size={17} />
            </span>
            <h2>{t("bookkeeper.uploadContracts")}</h2>
          </div>
          <p className="hint">{t("bookkeeper.uploadContractsHint")}</p>
          {loading ? (
            <SkeletonRows count={3} avatar={false} />
          ) : (
            <ul className="list">
              {employees.map((e) => (
                <li key={e.id}>
                  <span>{e.name}</span>
                  <span className="actions">
                    <input
                      placeholder={t("team.role")}
                      value={contractRoles[e.id] ?? ""}
                      onChange={(ev) =>
                        setContractRoles({ ...contractRoles, [e.id]: ev.target.value })
                      }
                    />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(ev) => handleContractFileChange(e.id, ev)}
                    />
                  </span>
                </li>
              ))}
              {employees.length === 0 && <li className="empty">{t("bookkeeper.noEmployees")}</li>}
            </ul>
          )}
          <button
            type="button"
            onClick={handleUploadContracts}
            disabled={uploadingContracts || contractTargets.length === 0}
          >
            {uploadingContracts
              ? t("bookkeeper.uploading")
              : t("bookkeeper.uploadForCount", { count: contractTargets.length })}
          </button>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("bookkeeper.history")}</h2>
          </div>
          {loading ? (
            <SkeletonRows count={3} />
          ) : (
            <ul className="list">
              {employees.map((e) => (
                <li key={e.id} className="bookkeeper-history-row">
                  <strong>{e.name}</strong>
                  <span className="hint">{e.email}</span>
                  <span className="hint">
                    {t("bookkeeper.hoursThisMonth", { hours: e.hoursThisMonth })}
                  </span>
                  {e.payslips.length === 0 && e.contracts.length === 0 ? (
                    <span className="hint">{t("bookkeeper.noDocuments")}</span>
                  ) : (
                    <div>
                      {e.payslips.map((p) => (
                        <button
                          key={`payslip-${p.id}`}
                          type="button"
                          className="link-btn"
                          onClick={() => handleViewPayslipPdf(e.id, p.id)}
                          disabled={!p.pdfFilename}
                        >
                          {t("bookkeeper.payslipLabel", { period: p.period })}
                        </button>
                      ))}
                      {e.contracts.map((c) => (
                        <button
                          key={`contract-${c.id}`}
                          type="button"
                          className="link-btn"
                          onClick={() => handleViewContractPdf(e.id, c.id)}
                          disabled={!c.pdfFilename}
                        >
                          {t("bookkeeper.contractLabel", { role: c.role })}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {employees.length === 0 && <li className="empty">{t("bookkeeper.noEmployees")}</li>}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
