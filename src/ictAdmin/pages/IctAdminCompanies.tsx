import { type FormEvent, useEffect, useState } from "react";
import { ictAdminApi, type IctAdminCompany } from "../client";

export default function IctAdminCompanies() {
  const [companies, setCompanies] = useState<IctAdminCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<IctAdminCompany | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  function load() {
    ictAdminApi
      .listCompanies()
      .then(setCompanies)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!logo) {
      setError("A logo image is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ictAdminApi.createCompany({ companyName, firstName, lastName, email, password, logo });
      setCompanyName("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setLogo(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await ictAdminApi.deleteCompany(confirmTarget.id);
      setConfirmTarget(null);
      setConfirmText("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="ict-page-title">Manage Companies</h1>
      <p className="ict-page-sub">
        {companies.length} compan{companies.length === 1 ? "y" : "ies"}. Deleting a company permanently
        removes it and everyone in it.
      </p>

      {error && <div className="ict-error">{error}</div>}

      <button className="ict-secondary-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "+ Add company"}
      </button>

      {showForm && (
        <form className="ict-ticket-form" onSubmit={handleCreate} style={{ marginTop: 14 }}>
          <input
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
          <div className="ict-ticket-form-row">
            <input
              placeholder="Manager first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              placeholder="Manager last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <input
            type="email"
            placeholder="Manager email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Manager password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            required
          />
          <div className="ict-ticket-form-row">
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create company (15-day trial)"}
            </button>
          </div>
        </form>
      )}

      <table className="ict-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Plan</th>
            <th>Users</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.slug}</td>
              <td>{c.plan}</td>
              <td>{c.userCount}</td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="ict-danger-btn" onClick={() => setConfirmTarget(c)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirmTarget && (
        <div className="ict-modal-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="ict-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete "{confirmTarget.name}"?</h2>
            <p>
              This permanently deletes the company, its {confirmTarget.userCount} user account(s), and all
              of its shifts, attendance, messages, payslips, and other data. This cannot be undone.
            </p>
            <p>
              Type <strong>{confirmTarget.name}</strong> to confirm.
            </p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            <div className="ict-ticket-form-row" style={{ marginTop: 14 }}>
              <button onClick={() => setConfirmTarget(null)}>Cancel</button>
              <button
                className="ict-danger-btn"
                disabled={confirmText !== confirmTarget.name || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
