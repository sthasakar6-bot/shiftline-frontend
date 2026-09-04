import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Contract, Payslip, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";
import EmployeeDetailModal from "./EmployeeDetailModal";

const PRESENCE_POLL_MS = 15000;

export default function ManagerSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [employees, setEmployees] = useState<UserSummary[]>([]);
  const [removeTarget, setRemoveTarget] = useState<UserSummary | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
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

  function loadReports() {
    api.listReports().then(setReports).catch(() => {});
  }

  function loadEmployees() {
    api.listEmployees().then(setEmployees).catch(() => {});
  }

  useEffect(loadReports, []);
  useEffect(loadEmployees, []);

  useEffect(() => {
    if (detailTargetId === null) return;
    const timer = setInterval(loadEmployees, PRESENCE_POLL_MS);
    return () => clearInterval(timer);
  }, [detailTargetId]);

  const detailTarget = employees.find((e) => e.id === detailTargetId) ?? null;

  async function handleAddToTeam(id: number) {
    setError(null);
    try {
      await api.assignManager(id);
      loadReports();
      loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add to team");
    }
  }

  async function handleRemoveFromTeam(id: number) {
    setError(null);
    try {
      await api.removeFromTeam(id);
      loadReports();
      loadEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove from team");
    } finally {
      setRemoveTarget(null);
    }
  }

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
      setMessage("Contract created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create contract");
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
      setMessage("Contract PDF uploaded.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload PDF");
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
      setError(err instanceof ApiError ? err.message : "Failed to open contract");
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
      setMessage("Payslip created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create payslip");
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
      setMessage("Payslip PDF uploaded.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload PDF");
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
      setError(err instanceof ApiError ? err.message : "Failed to open payslip");
    }
  }

  async function handleDeletePayslip(payslipId: number) {
    const userId = Number(payslipReport);
    await api.deletePayslipForReport(userId, payslipId);
    loadPayslips(userId);
  }

  return (
    <section className="panel">
      <h2>Manage team</h2>
      <ul className="list">
        {employees.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="list-row-identity"
              onClick={() => setDetailTargetId(e.id)}
            >
              <Avatar userId={e.id} name={e.name} hasAvatar={e.hasAvatar} size={32} />
              {e.name}
              {e.online && <span className="presence-dot inline" title="Online now" />}
            </button>
            <span className="actions">
              {e.managerId === user?.id ? (
                <button onClick={() => setRemoveTarget(e)}>Remove from team</button>
              ) : (
                <button onClick={() => handleAddToTeam(e.id)}>Add to my team</button>
              )}
            </span>
          </li>
        ))}
        {employees.length === 0 && <li className="empty">No employees registered yet.</li>}
      </ul>
      {error && <div className="error">{error}</div>}

      {detailTarget && (
        <EmployeeDetailModal employee={detailTarget} onClose={() => setDetailTargetId(null)} />
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove from team?"
          message={`Are you sure you want to remove ${removeTarget.name} from your team?`}
          confirmLabel="Remove"
          danger
          onConfirm={() => handleRemoveFromTeam(removeTarget.id)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      <h3>Manage contracts</h3>
      <div className="inline-form">
        <select value={contractReport} onChange={(e) => setContractReport(e.target.value)}>
          <option value="">Select employee</option>
          {user && <option value={user.id}>{user.name} (you)</option>}
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
                  {!c.pdfFilename && " — no PDF uploaded"}
                </span>
                <span className="actions">
                  {c.pdfFilename && <button onClick={() => handleViewPdf(c.id)}>View PDF</button>}
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
                    {c.pdfFilename ? "Replace PDF" : "Upload PDF"}
                  </button>
                  <button onClick={() => handleDeleteContract(c.id)}>Delete</button>
                </span>
              </li>
            ))}
            {contracts.length === 0 && <li className="empty">No contracts yet.</li>}
          </ul>

          <form className="inline-form" onSubmit={handleCreateContract}>
            <input
              placeholder="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit">Create contract</button>
          </form>

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}

      <h3>Manage payslips</h3>
      <div className="inline-form">
        <select value={payslipReport} onChange={(e) => setPayslipReport(e.target.value)}>
          <option value="">Select employee</option>
          {user && <option value={user.id}>{user.name} (you)</option>}
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
                  {!p.pdfFilename && " — no PDF uploaded"}
                </span>
                <span className="actions">
                  {p.pdfFilename && (
                    <button onClick={() => handleViewPayslipPdf(p.id)}>View PDF</button>
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
                    {p.pdfFilename ? "Replace PDF" : "Upload PDF"}
                  </button>
                  <button onClick={() => handleDeletePayslip(p.id)}>Delete</button>
                </span>
              </li>
            ))}
            {payslips.length === 0 && <li className="empty">No payslips yet.</li>}
          </ul>

          <form className="inline-form" onSubmit={handleCreatePayslip}>
            <input
              placeholder="Pay period (e.g. August 2026)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
            />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPayslipPdfFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit">Create payslip</button>
          </form>

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}
    </section>
  );
}
