import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LeaveRequest, Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatTime } from "../lib/formatDate";
import { getDateLocale } from "../i18n";
import Avatar from "./Avatar";

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftHours(s: Shift): number {
  const ms = new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime();
  return ms / 3600000 - (s.breakMinutes ?? 0) / 60;
}

export default function EmployeeSummarySection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [rangeStart, setRangeStart] = useState(startOfMonth());
  const [rangeEnd, setRangeEnd] = useState(today());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);

  const youLabel = `(${t("common.you")})`;
  const people = user
    ? [{ id: user.id, name: `${user.name} ${youLabel}`, hasAvatar: user.hasAvatar }, ...reports]
    : reports;

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setShifts([]);
      setLeaveRequests([]);
      return;
    }
    const userId = Number(selected);
    api.listShiftsForReport(userId).then(setShifts).catch(() => {});
    api.listLeaveRequestsForReport(userId).then(setLeaveRequests).catch(() => {});
  }, [selected]);

  const rangeStartMs = useMemo(() => new Date(rangeStart).getTime(), [rangeStart]);
  const rangeEndMs = useMemo(() => new Date(rangeEnd).getTime() + 86400000, [rangeEnd]);

  const shiftsInRange = useMemo(
    () =>
      shifts
        .filter((s) => {
          const t = new Date(s.startsAt).getTime();
          return t >= rangeStartMs && t < rangeEndMs;
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [shifts, rangeStartMs, rangeEndMs],
  );

  const leaveInRange = useMemo(
    () =>
      leaveRequests
        .filter((l) => {
          const start = new Date(l.startDate).getTime();
          const end = new Date(l.endDate).getTime();
          return start < rangeEndMs && end >= rangeStartMs;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [leaveRequests, rangeStartMs, rangeEndMs],
  );

  const totalHours = shiftsInRange.reduce((sum, s) => sum + shiftHours(s), 0);
  const selectedPerson = people.find((p) => String(p.id) === selected);

  async function handleDownloadPdf() {
    if (!selectedPerson) return;
    setPdfBusy(true);
    try {
      // Loaded on demand -- jsPDF pulls in a heavy html2canvas/dompurify
      // dependency chain that only a manager exporting a summary needs.
      const { downloadSummaryPdf } = await import("../lib/summaryPdf");
      await downloadSummaryPdf({
        businessName: user?.companyName,
        employeeName: selectedPerson.name,
        rangeLabel: `${rangeStart} — ${rangeEnd}`,
        generatedByLine: t("adminRoster.pdfGeneratedBy", {
          date: new Date().toLocaleDateString(getDateLocale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          name: user?.name ?? "",
        }),
        shiftsTitle: t("summary.shifts"),
        shiftsColumns: [
          t("summary.csvDate"),
          t("summary.csvStart"),
          t("summary.csvEnd"),
          t("summary.csvBreakMin"),
          t("summary.csvHours"),
        ],
        shiftRows: shiftsInRange.map((s) => ({
          date: new Date(s.startsAt).toLocaleDateString(getDateLocale()),
          start: formatTime(s.startsAt),
          end: formatTime(s.endsAt),
          breakMin: String(s.breakMinutes ?? 0),
          hours: shiftHours(s).toFixed(2),
        })),
        totalHoursLabel: t("summary.csvTotalHours"),
        totalHours: totalHours.toFixed(2),
        noShiftsText: t("summary.noShiftsRange"),
        leaveTitle: t("summary.leave"),
        leaveColumns: [
          t("summary.csvType"),
          t("summary.csvStartDate"),
          t("summary.csvEndDate"),
          t("summary.csvStatus"),
        ],
        leaveRows: leaveInRange.map((l) => ({
          type: t(`leave.${l.type}`),
          startDate: new Date(l.startDate).toLocaleDateString(getDateLocale()),
          endDate: new Date(l.endDate).toLocaleDateString(getDateLocale()),
          status: t(`leave.${l.status}`),
        })),
        noLeaveText: t("summary.noLeaveRange"),
        fileName: `Shiftline-Summary_${selectedPerson.name.replace(/\s+/g, "-")}_${rangeStart}_to_${rangeEnd}.pdf`,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>{t("summary.title")}</h2>

      <div className="attendance-person-picker">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`attendance-person-chip${String(p.id) === selected ? " active" : ""}`}
            onClick={() => setSelected(String(p.id))}
          >
            <Avatar userId={p.id} name={p.name} hasAvatar={p.hasAvatar} size={28} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="inline-form">
        <label className="field">
          <span className="field-label">{t("summary.from")}</span>
          <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("summary.to")}</span>
          <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
        </label>
      </div>

      {selected && (
        <>
          <p>
            <strong>{t("summary.hoursScheduled", { hours: totalHours.toFixed(1) })}</strong>{" "}
            {t("summary.scheduledAcross", { count: shiftsInRange.length })}
          </p>

          <button onClick={handleDownloadPdf} disabled={pdfBusy}>
            {t("summary.downloadPdf")}
          </button>

          <h3>{t("summary.shifts")}</h3>
          {shiftsInRange.length === 0 ? (
            <p className="empty-state">{t("summary.noShiftsRange")}</p>
          ) : (
            <div className="summary-grid-scroll">
              <table className="summary-grid">
                <thead>
                  <tr>
                    <th>{t("summary.csvDate")}</th>
                    <th>{t("summary.csvStart")}</th>
                    <th>{t("summary.csvEnd")}</th>
                    <th>{t("summary.csvBreakMin")}</th>
                    <th>{t("summary.csvHours")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftsInRange.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {new Date(s.startsAt).toLocaleDateString(getDateLocale(), {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>{formatTime(s.startsAt)}</td>
                      <td>{formatTime(s.endsAt)}</td>
                      <td>{s.breakMinutes ?? 0}</td>
                      <td>{shiftHours(s).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3>{t("summary.leave")}</h3>
          {leaveInRange.length === 0 ? (
            <p className="empty-state">{t("summary.noLeaveRange")}</p>
          ) : (
            <div className="summary-grid-scroll">
              <table className="summary-grid">
                <thead>
                  <tr>
                    <th>{t("summary.csvType")}</th>
                    <th>{t("summary.csvStartDate")}</th>
                    <th>{t("summary.csvEndDate")}</th>
                    <th>{t("summary.csvStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveInRange.map((l) => (
                    <tr key={l.id}>
                      <td>{t(`leave.${l.type}`)}</td>
                      <td>{new Date(l.startDate).toLocaleDateString(getDateLocale())}</td>
                      <td>{new Date(l.endDate).toLocaleDateString(getDateLocale())}</td>
                      <td>{t(`leave.${l.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
