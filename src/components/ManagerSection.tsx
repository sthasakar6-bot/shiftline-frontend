import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Contract, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";

export default function ManagerSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [employees, setEmployees] = useState<UserSummary[]>([]);
  const [removeTarget, setRemoveTarget] = useState<UserSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Contract management
  const [contractReport, setContractReport] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [role, setRole] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [reuploadFiles, setReuploadFiles] = useState<Record<number, File | null>>({});

  function loadReports() {
    api.listReports().then(setReports).catch(() => {});
  }

  function loadEmployees() {
    api.listEmployees().then(setEmployees).catch(() => {});
  }

  useEffect(loadReports, []);
  useEffect(loadEmployees, []);

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

  return (
    <section className="panel">
      <h2>Manage team</h2>
      <ul className="list">
        {employees.map((e) => (
          <li key={e.id}>
            <span>{e.name}</span>
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

      {reports.length > 0 && (
        <>
          <h3>Manage contracts</h3>
          <div className="inline-form">
            <select value={contractReport} onChange={(e) => setContractReport(e.target.value)}>
              <option value="">Select employee</option>
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
                      {c.pdfFilename && (
                        <button onClick={() => handleViewPdf(c.id)}>View PDF</button>
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
            </>
          )}

          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
        </>
      )}
    </section>
  );
}
