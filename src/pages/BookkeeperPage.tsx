import { type ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Receipt, Trash2, Folder } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { BookkeeperEmployee } from "../api/types";
import LanguageSwitcher from "../components/LanguageSwitcher";
import UserBox from "../components/UserBox";
import { SkeletonRows } from "../components/Skeleton";
import ConfirmDialog from "../components/ConfirmDialog";

type DeleteTarget = { type: "payslip" | "contract"; employeeId: number; id: number; label: string };

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

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    setError(null);
    try {
      if (deleteTarget.type === "payslip") {
        await api.deleteBookkeeperPayslip(deleteTarget.employeeId, deleteTarget.id);
      } else {
        await api.deleteBookkeeperContract(deleteTarget.employeeId, deleteTarget.id);
      }
      load();
    } catch {
      setError(t("bookkeeper.deleteFailed"));
    } finally {
      setDeleteTarget(null);
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
              <Folder size={17} />
            </span>
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
                    <div className="bookkeeper-doc-list">
                      {e.payslips.map((p) => (
                        <span className="bookkeeper-doc-row" key={`payslip-${p.id}`}>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleViewPayslipPdf(e.id, p.id)}
                            disabled={!p.pdfFilename}
                          >
                            {t("bookkeeper.payslipLabel", { period: p.period })}
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger-text"
                            aria-label={t("common.delete")}
                            onClick={() =>
                              setDeleteTarget({
                                type: "payslip",
                                employeeId: e.id,
                                id: p.id,
                                label: t("bookkeeper.payslipLabel", { period: p.period }),
                              })
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      ))}
                      {e.contracts.map((c) => (
                        <span className="bookkeeper-doc-row" key={`contract-${c.id}`}>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => handleViewContractPdf(e.id, c.id)}
                            disabled={!c.pdfFilename}
                          >
                            {t("bookkeeper.contractLabel", { role: c.role })}
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger-text"
                            aria-label={t("common.delete")}
                            onClick={() =>
                              setDeleteTarget({
                                type: "contract",
                                employeeId: e.id,
                                id: c.id,
                                label: t("bookkeeper.contractLabel", { role: c.role }),
                              })
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {employees.length === 0 && <li className="empty">{t("bookkeeper.noEmployees")}</li>}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <span className="panel-title-icon">
              <Receipt size={17} />
            </span>
            <h2>{t("bookkeeper.uploadPayslips")}</h2>
          </div>
          <label className="field">
            <span className="field-label">
              {t("team.payPeriod")} <span className="required-mark">*</span>
            </span>
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
      </main>

      {deleteTarget && (
        <ConfirmDialog
          title={t("bookkeeper.deleteConfirmTitle")}
          message={t("bookkeeper.deleteConfirmMessage", { label: deleteTarget.label })}
          confirmLabel={t("common.delete")}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
