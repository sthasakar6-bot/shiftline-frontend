import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Contract, Invite, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function ManagerSection() {
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [employees, setEmployees] = useState<UserSummary[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function inviteLinkFor(token: string) {
    return `${window.location.origin}/register?token=${token}`;
  }

  function handleCopyLink(token: string) {
    navigator.clipboard.writeText(inviteLinkFor(token)).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
    });
  }

  // Shift assignment
  const [shiftReport, setShiftReport] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

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

  function loadInvites() {
    api.listInvites().then(setInvites).catch(() => {});
  }

  useEffect(loadReports, []);
  useEffect(loadEmployees, []);
  useEffect(loadInvites, []);

  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLastInviteToken(null);
    try {
      const invite = await api.createInvite(inviteEmail);
      setInviteEmail("");
      setLastInviteToken(invite.token);
      loadInvites();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invite");
    }
  }

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

  async function handleAssignShift(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api.createShiftForReport(Number(shiftReport), { startsAt, endsAt });
      setStartsAt("");
      setEndsAt("");
      setMessage("Shift assigned.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign shift");
    }
  }

  async function handlePromote(id: number) {
    await api.promoteUser(id);
    loadReports();
  }

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
      <h2>My Team</h2>
      <ul className="list">
        {reports.map((r) => (
          <li key={r.id}>
            <span>
              {r.name} ({r.email}) — {r.role}
            </span>
            {r.role === "employee" && (
              <span className="actions">
                <button onClick={() => handlePromote(r.id)}>Promote to manager</button>
              </span>
            )}
          </li>
        ))}
        {reports.length === 0 && <li className="empty">No direct reports yet.</li>}
      </ul>

      <h3>Invite an employee</h3>
      <p className="hint">
        Create an invite, then copy the link and send it to them yourself (Gmail, WhatsApp, etc).
        The link lets them create an account under you.
      </p>
      <form className="inline-form" onSubmit={handleSendInvite}>
        <input
          type="email"
          placeholder="Employee's email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
        <button type="submit">Create invite</button>
      </form>
      {lastInviteToken && (
        <div className="inline-form">
          <input value={inviteLinkFor(lastInviteToken)} readOnly />
          <button type="button" onClick={() => handleCopyLink(lastInviteToken)}>
            {copiedToken === lastInviteToken ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
      <ul className="list">
        {invites.map((i) => (
          <li key={i.id}>
            <span>
              {i.email} — {i.status}
            </span>
            {i.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCopyLink(i.token)}>
                  {copiedToken === i.token ? "Copied!" : "Copy link"}
                </button>
              </span>
            )}
          </li>
        ))}
        {invites.length === 0 && <li className="empty">No invites sent yet.</li>}
      </ul>

      <h3>Manage team</h3>
      <ul className="list">
        {employees.map((e) => (
          <li key={e.id}>
            <span>
              {e.name} ({e.email}) —{" "}
              {e.managerId === user?.id
                ? "Reports to you"
                : e.managerId
                  ? "Managed by someone else"
                  : "Unassigned"}
            </span>
            <span className="actions">
              {e.managerId === user?.id ? (
                <button onClick={() => handleRemoveFromTeam(e.id)}>Remove from team</button>
              ) : (
                <button onClick={() => handleAddToTeam(e.id)}>Add to my team</button>
              )}
            </span>
          </li>
        ))}
        {employees.length === 0 && <li className="empty">No employees registered yet.</li>}
      </ul>
      {error && <div className="error">{error}</div>}

      {reports.length > 0 && (
        <>
          <h3>Assign a shift</h3>
          <form className="inline-form" onSubmit={handleAssignShift}>
            <select value={shiftReport} onChange={(e) => setShiftReport(e.target.value)} required>
              <option value="">Select report</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
            <button type="submit">Assign</button>
          </form>

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
