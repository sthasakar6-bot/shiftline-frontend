import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { api } from "../api/client";
import type { LeaveRequest, Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatTime } from "../lib/formatDate";
import { getDateLocale } from "../i18n";

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
  const people = user ? [{ id: user.id, name: `${user.name} ${youLabel}` }, ...reports] : reports;

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
      <div className="panel-title">
        <span className="panel-title-icon">
          <BarChart3 size={17} />
        </span>
        <h2>{t("summary.title")}</h2>
      </div>
      <p className="hint">{t("summary.hint")}</p>

      <div className="inline-form">
        <label className="field">
          <span className="field-label">{t("summary.employee")}</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{t("team.selectEmployee")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
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
          <ul className="list">
            {shiftsInRange.map((s) => (
              <li key={s.id}>
                <span>
                  {new Date(s.startsAt).toLocaleDateString(getDateLocale(), {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  — {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                  {s.breakMinutes && t("summary.breakSuffix", { min: s.breakMinutes })}
                </span>
              </li>
            ))}
            {shiftsInRange.length === 0 && <li className="empty">{t("summary.noShiftsRange")}</li>}
          </ul>

          <h3>{t("summary.leave")}</h3>
          <ul className="list">
            {leaveInRange.map((l) => (
              <li key={l.id}>
                <span>
                  {t(`leave.${l.type}`)} — {new Date(l.startDate).toLocaleDateString(getDateLocale())} to{" "}
                  {new Date(l.endDate).toLocaleDateString(getDateLocale())} ({t(`leave.${l.status}`)})
                </span>
              </li>
            ))}
            {leaveInRange.length === 0 && <li className="empty">{t("summary.noLeaveRange")}</li>}
          </ul>
        </>
      )}
    </section>
  );
}
