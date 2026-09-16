import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Phone } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Contract, Payslip } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { getDateLocale } from "../i18n";
import Avatar from "./Avatar";

type Person = { id: number; name: string; hasAvatar: boolean; phone: string | null };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(getDateLocale(), { year: "numeric", month: "short", day: "numeric" });
}

export default function PayrollSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [contractsByUser, setContractsByUser] = useState<Map<number, Contract[]>>(new Map());
  const [payslipsByUser, setPayslipsByUser] = useState<Map<number, Payslip[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [detailPersonId, setDetailPersonId] = useState<number | null>(null);

  function reload() {
    api
      .listReports()
      .then(async (reports) => {
        const all: Person[] = [
          ...(user ? [{ id: user.id, name: user.name, hasAvatar: user.hasAvatar, phone: null }] : []),
          ...reports.map((r) => ({ id: r.id, name: r.name, hasAvatar: r.hasAvatar, phone: r.phone })),
        ];
        setPeople(all);
        const results = await Promise.all(
          all.map((p) =>
            Promise.all([api.listContractsForReport(p.id), api.listPayslipsForReport(p.id)]).then(
              ([contracts, payslips]) => [p.id, contracts, payslips] as const,
            ),
          ),
        );
        setContractsByUser(new Map(results.map(([id, contracts]) => [id, contracts])));
        setPayslipsByUser(new Map(results.map(([id, , payslips]) => [id, payslips])));
      })
      .finally(() => setLoading(false));
  }

  useEffect(reload, [user?.id]);

  const detailPerson = people.find((p) => p.id === detailPersonId) ?? null;

  return (
    <section className="panel">
      <h2>{t("team.payrollTitle")}</h2>

      {loading ? (
        <p className="hint">{t("common.loading")}</p>
      ) : (
        <div className="attendance-grid-scroll">
          <table className="attendance-grid">
            <thead>
              <tr>
                <th className="attendance-grid-person-col" />
                <th>{t("team.payrollPhone")}</th>
                <th>{t("team.payrollContract")}</th>
                <th>{t("team.payrollPayslips")}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const contracts = contractsByUser.get(p.id) ?? [];
                const current = contracts[0];
                const payslips = payslipsByUser.get(p.id) ?? [];
                return (
                  <tr key={p.id}>
                    <td className="attendance-grid-person-col">
                      <button
                        type="button"
                        className="list-row-identity"
                        onClick={() => setDetailPersonId(p.id)}
                      >
                        <Avatar userId={p.id} name={p.name} hasAvatar={p.hasAvatar} size={28} />
                        {p.name}
                      </button>
                    </td>
                    <td>
                      {p.phone ? (
                        <span className="payroll-cell-phone">
                          <Phone size={12} /> {p.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {current ? (
                        <span className="payroll-cell-contract">
                          <strong>{current.role}</strong>
                          <span className="payroll-cell-dates">
                            {formatDate(current.startDate)} – {formatDate(current.endDate)}
                          </span>
                        </span>
                      ) : (
                        <span className="empty-state">{t("team.noContracts")}</span>
                      )}
                    </td>
                    <td>
                      {payslips.length > 0 ? (
                        <span className="payroll-cell-payslips">
                          <FileText size={12} /> {t("team.payslipCount", { count: payslips.length })}
                        </span>
                      ) : (
                        <span className="empty-state">{t("team.noPayslips")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailPerson && (
        <PayrollDetailModal
          person={detailPerson}
          contracts={contractsByUser.get(detailPerson.id) ?? []}
          payslips={payslipsByUser.get(detailPerson.id) ?? []}
          onClose={() => setDetailPersonId(null)}
          onChanged={reload}
        />
      )}
    </section>
  );
}

function PayrollDetailModal({
  person,
  contracts,
  payslips,
  onClose,
  onChanged,
}: {
  person: Person;
  contracts: Contract[];
  payslips: Payslip[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [reuploadFiles, setReuploadFiles] = useState<Record<number, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreateContract(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const contract = await api.createContractForReport(person.id, {
        role,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      if (pdfFile) {
        await api.uploadContractPdfForReport(person.id, contract.id, pdfFile);
      }
      setRole("");
      setStartDate("");
      setEndDate("");
      setPdfFile(null);
      onChanged();
      setMessage(t("team.contractCreated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.createContractFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleEditDates(contractId: number, field: "startDate" | "endDate", value: string) {
    setError(null);
    try {
      await api.updateContractForReport(person.id, contractId, { [field]: value || null });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.createContractFailed"));
    }
  }

  async function handleUploadPdf(contractId: number) {
    const file = reuploadFiles[contractId];
    if (!file) return;
    setError(null);
    try {
      await api.uploadContractPdfForReport(person.id, contractId, file);
      setReuploadFiles({ ...reuploadFiles, [contractId]: null });
      onChanged();
      setMessage(t("team.contractPdfUploaded"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.uploadPdfFailed"));
    }
  }

  async function handleViewPdf(contractId: number) {
    setError(null);
    try {
      const blob = await api.getContractPdfForReport(person.id, contractId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("contracts.openFailed"));
    }
  }

  async function handleDeleteContract(contractId: number) {
    setError(null);
    try {
      await api.deleteContractForReport(person.id, contractId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("team.createContractFailed"));
    }
  }

  async function handleViewPayslipPdf(payslipId: number) {
    setError(null);
    try {
      const blob = await api.getPayslipPdfForReport(person.id, payslipId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("payslips.openFailed"));
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal payroll-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{person.name}</h3>

        <h4>{t("team.manageContracts")}</h4>
        <ul className="list">
          {contracts.map((c) => (
            <li key={c.id} className="payroll-contract-row">
              <div>
                <strong>{c.role}</strong>
                {!c.pdfFilename && ` — ${t("team.noPdfUploaded")}`}
              </div>
              <div className="inline-form">
                <label className="field">
                  <span className="field-label">{t("summary.from")}</span>
                  <input
                    type="date"
                    defaultValue={c.startDate ? c.startDate.slice(0, 10) : ""}
                    onBlur={(e) => handleEditDates(c.id, "startDate", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">{t("summary.to")}</span>
                  <input
                    type="date"
                    defaultValue={c.endDate ? c.endDate.slice(0, 10) : ""}
                    onBlur={(e) => handleEditDates(c.id, "endDate", e.target.value)}
                  />
                </label>
              </div>
              <span className="actions">
                {c.pdfFilename && <button onClick={() => handleViewPdf(c.id)}>{t("team.viewPdf")}</button>}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setReuploadFiles({ ...reuploadFiles, [c.id]: e.target.files?.[0] ?? null })
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
          <input placeholder={t("team.role")} value={role} onChange={(e) => setRole(e.target.value)} required />
          <label className="field">
            <span className="field-label">{t("summary.from")}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t("summary.to")}</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={saving}>
            {t("team.createContract")}
          </button>
        </form>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        <h4>{t("team.managePayslips")}</h4>
        <ul className="list">
          {payslips.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.period}</strong>
                {!p.pdfFilename && ` — ${t("team.noPdfUploaded")}`}
              </span>
              {p.pdfFilename && (
                <span className="actions">
                  <button onClick={() => handleViewPayslipPdf(p.id)}>{t("team.viewPdf")}</button>
                </span>
              )}
            </li>
          ))}
          {payslips.length === 0 && <li className="empty">{t("team.noPayslips")}</li>}
        </ul>
        <p className="hint">{t("team.payslipsFromBookkeeper")}</p>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
