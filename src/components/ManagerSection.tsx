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
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editEndDates, setEditEndDates] = useState<Record<number, string>>({});

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
      await api.createContractForReport(userId, {
        title,
        startDate,
        endDate: endDate || undefined,
      });
      setTitle("");
      setStartDate("");
      setEndDate("");
      loadContracts(userId);
      setMessage("Contract created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create contract");
    }
  }

  async function handleUpdateEndDate(contractId: number) {
    const userId = Number(contractReport);
    const newEndDate = editEndDates[contractId];
    if (!newEndDate) return;
    try {
      await api.updateContractForReport(userId, contractId, { endDate: newEndDate });
      loadContracts(userId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update end date");
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
              <option value="">Select report</option>
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
                      <strong>{c.title}</strong> — {c.status}
                      <br />
                      Start: {c.startDate.slice(0, 10)} · End:{" "}
                      {c.endDate ? c.endDate.slice(0, 10) : "Not set"}
                    </span>
                    <span className="actions">
                      <input
                        type="date"
                        value={editEndDates[c.id] ?? ""}
                        onChange={(e) =>
                          setEditEndDates({ ...editEndDates, [c.id]: e.target.value })
                        }
                      />
                      <button onClick={() => handleUpdateEndDate(c.id)}>Set end date</button>
                      <button onClick={() => handleDeleteContract(c.id)}>Delete</button>
                    </span>
                  </li>
                ))}
                {contracts.length === 0 && <li className="empty">No contracts yet.</li>}
              </ul>

              <form className="inline-form" onSubmit={handleCreateContract}>
                <input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  title="Start date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End date (optional)"
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
