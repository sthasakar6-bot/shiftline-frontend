import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LeaveRequest, Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatTime } from "../lib/formatDate";
import { getDateLocale } from "../i18n";
import { downloadCsv } from "../lib/csv";

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

  function handleDownloadCsv() {
    if (!selectedPerson) return;
    const rows: string[][] = [
      [t("summary.employee"), selectedPerson.name],
      [t("summary.csvDateRange"), `${rangeStart} to ${rangeEnd}`],
      [],
      [t("summary.shifts")],
      [t("summary.csvDate"), t("summary.csvStart"), t("summary.csvEnd"), t("summary.csvBreakMin"), t("summary.csvHours")],
      ...shiftsInRange.map((s) => [
        new Date(s.startsAt).toLocaleDateString(getDateLocale()),
        formatTime(s.startsAt),
        formatTime(s.endsAt),
        String(s.breakMinutes ?? 0),
        shiftHours(s).toFixed(2),
      ]),
      ["", "", "", t("summary.csvTotalHours"), totalHours.toFixed(2)],
      [],
      [t("summary.csvLeaveRequests")],
      [t("summary.csvType"), t("summary.csvStartDate"), t("summary.csvEndDate"), t("summary.csvStatus")],
      ...leaveInRange.map((l) => [
        t(`leave.${l.type}`),
        new Date(l.startDate).toLocaleDateString(getDateLocale()),
        new Date(l.endDate).toLocaleDateString(getDateLocale()),
        t(`leave.${l.status}`),
      ]),
    ];
    downloadCsv(`${selectedPerson.name.replace(/\s+/g, "-")}-${rangeStart}-to-${rangeEnd}.csv`, rows);
  }

  return (
    <section className="panel">
      <h2>{t("summary.title")}</h2>
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

          <button onClick={handleDownloadCsv}>{t("summary.downloadCsv")}</button>

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
