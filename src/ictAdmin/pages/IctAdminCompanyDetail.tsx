import { type FormEvent, useEffect, useState } from "react";
import { ictAdminApi, type IctAdminCompanyProfile, type CompanyProfileFields } from "../client";

const EMPTY_FIELDS: CompanyProfileFields = {
  kvkNumber: "",
  vatNumber: "",
  legalAddress: "",
  businessType: "",
  countryOfRegistration: "",
  contactPersonName: "",
  contactPersonRole: "",
  billingEmail: "",
  billingAddress: "",
  customPricingNotes: "",
  industry: "",
  payrollCycle: "",
  schedulingFormat: "",
  shiftRulesNotes: "",
  supportEmail: "",
  phoneNumber: "",
  preferredLanguage: "",
  emergencyContact: "",
  preferredCommunicationChannel: "",
  companyEmail: "",
  companyPhone: "",
  addressStreet: "",
  addressNumber: "",
  addressPostcode: "",
  addressCity: "",
  estimatedEmployeeCount: null,
};

function field(label: string, key: keyof CompanyProfileFields, values: CompanyProfileFields, onChange: (key: keyof CompanyProfileFields, value: string) => void) {
  return (
    <label className="ict-field">
      <span className="ict-field-label">{label}</span>
      <input value={values[key] ?? ""} onChange={(e) => onChange(key, e.target.value)} />
    </label>
  );
}

export default function IctAdminCompanyDetail({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const [profile, setProfile] = useState<IctAdminCompanyProfile | null>(null);
  const [fields, setFields] = useState<CompanyProfileFields>(EMPTY_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    ictAdminApi
      .getCompanyProfile(companyId)
      .then((data) => {
        setProfile(data);
        setFields({ ...EMPTY_FIELDS, ...data.company });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load company"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [companyId]);

  function onFieldChange(key: keyof CompanyProfileFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await ictAdminApi.updateCompanyProfile(companyId, fields);
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <button className="ict-secondary-btn" onClick={onClose}>
          &larr; Back to companies
        </button>
        <p className="ict-page-sub" style={{ marginTop: 14 }}>
          Loading...
        </p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div>
        <button className="ict-secondary-btn" onClick={onClose}>
          &larr; Back to companies
        </button>
        <div className="ict-error" style={{ marginTop: 14 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!profile) return null;
  const { company, stats, billing } = profile;

  return (
    <div>
      <button className="ict-secondary-btn" onClick={onClose}>
        &larr; Back to companies
      </button>
      <h1 className="ict-page-title" style={{ marginTop: 14 }}>
        {company.name}
      </h1>
      <p className="ict-page-sub">
        {company.slug} &middot; created {new Date(company.createdAt).toLocaleDateString()}
      </p>

      {error && <div className="ict-error">{error}</div>}

      <div className="ict-stat-grid" style={{ marginBottom: 24 }}>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Plan</span>
          <span className="ict-stat-value">{company.plan}</span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Payment status</span>
          <span className="ict-stat-value">{company.subscriptionStatus ?? (company.trialEndsAt ? "trial" : "—")}</span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Employees</span>
          <span className="ict-stat-value">
            {stats.employeeCount} ({stats.activeEmployeeCount} active)
          </span>
        </div>
        <div className="ict-stat-card">
          <span className="ict-stat-label">Renewal / trial ends</span>
          <span className="ict-stat-value">
            {billing?.nextPaymentDate
              ? new Date(billing.nextPaymentDate).toLocaleDateString()
              : company.trialEndsAt
                ? new Date(company.trialEndsAt).toLocaleDateString()
                : "—"}
          </span>
        </div>
      </div>

      <div className="ict-detail-section">
        <h2 className="ict-detail-section-title">Employees &amp; locations</h2>
        <p className="ict-page-sub">
          Roles:{" "}
          {stats.rolesBreakdown.length === 0
            ? "none yet"
            : stats.rolesBreakdown.map((r) => `${r.role} (${r.count})`).join(", ")}
        </p>
        <p className="ict-page-sub">
          Work locations: {stats.workLocations.length === 0 ? "none yet" : stats.workLocations.join(", ")}
        </p>
      </div>

      {billing && (
        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Invoice history</h2>
          {billing.payments.length === 0 ? (
            <p className="ict-page-sub">No payments yet.</p>
          ) : (
            <table className="ict-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}</td>
                    <td>{p.description}</td>
                    <td>
                      {p.amount.value} {p.amount.currency}
                    </td>
                    <td>{p.method ?? "—"}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Legal &amp; business</h2>
          <div className="ict-field-grid">
            {field("KVK number", "kvkNumber", fields, onFieldChange)}
            {field("BTW / VAT number", "vatNumber", fields, onFieldChange)}
            {field("Registered business address", "legalAddress", fields, onFieldChange)}
            {field("Business type (BV, VOF, Eenmanszaak...)", "businessType", fields, onFieldChange)}
            {field("Country of registration", "countryOfRegistration", fields, onFieldChange)}
            <label className="ict-field">
              <span className="ict-field-label">Number of employees</span>
              <input
                type="number"
                min={0}
                value={fields.estimatedEmployeeCount ?? ""}
                onChange={(e) =>
                  setFields((prev) => ({
                    ...prev,
                    estimatedEmployeeCount: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Company contact &amp; address</h2>
          <div className="ict-field-grid">
            {field("Company email", "companyEmail", fields, onFieldChange)}
            {field("Company phone number", "companyPhone", fields, onFieldChange)}
            {field("Street", "addressStreet", fields, onFieldChange)}
            {field("House/building number", "addressNumber", fields, onFieldChange)}
            {field("Postcode", "addressPostcode", fields, onFieldChange)}
            {field("City", "addressCity", fields, onFieldChange)}
          </div>
        </div>

        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Billing</h2>
          <div className="ict-field-grid">
            {field("Contact person (owner/manager)", "contactPersonName", fields, onFieldChange)}
            {field("Contact person role", "contactPersonRole", fields, onFieldChange)}
            {field("Billing email", "billingEmail", fields, onFieldChange)}
            {field("Billing address (if different)", "billingAddress", fields, onFieldChange)}
            {field("Discounts / custom pricing notes", "customPricingNotes", fields, onFieldChange)}
          </div>
        </div>

        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Operations</h2>
          <div className="ict-field-grid">
            {field("Industry (retail, hospitality...)", "industry", fields, onFieldChange)}
            {field("Payroll cycle (weekly, bi-weekly, monthly)", "payrollCycle", fields, onFieldChange)}
            {field("Preferred scheduling format (24h, AM/PM)", "schedulingFormat", fields, onFieldChange)}
            {field("Shift rules (overtime, breaks, max hours)", "shiftRulesNotes", fields, onFieldChange)}
          </div>
        </div>

        <div className="ict-detail-section">
          <h2 className="ict-detail-section-title">Communication</h2>
          <div className="ict-field-grid">
            {field("Support contact email", "supportEmail", fields, onFieldChange)}
            {field("Phone number", "phoneNumber", fields, onFieldChange)}
            {field("Preferred language (NL/EN)", "preferredLanguage", fields, onFieldChange)}
            {field("Emergency contact", "emergencyContact", fields, onFieldChange)}
            {field("Preferred communication channel", "preferredCommunicationChannel", fields, onFieldChange)}
          </div>
        </div>

        <div className="ict-ticket-form-row" style={{ marginTop: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && <span className="ict-page-sub">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
