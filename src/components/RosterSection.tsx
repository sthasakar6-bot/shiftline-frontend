import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, FileDown } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Shift, UserSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";
import { formatTime, compactTime } from "../lib/formatDate";
import { getDateLocale } from "../i18n";

interface RosterEntry extends Shift {
  employeeName: string;
}

// datetime-local gives a plain string with no timezone (e.g. "2026-09-01T09:00")
// -- interpreting it via `new Date(...)` reads it as the browser's local time,
// and toISOString() converts that to the correct UTC instant to send, instead
// of the server assuming UTC for the naive string and silently shifting it.
function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function toDatetimeLocal(day: Date, hour: number, minute: number): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ShiftModalState =
  | { mode: "add"; userId: number; userName: string; day: Date }
  | { mode: "edit"; entry: RosterEntry };

export default function RosterSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [removeTarget, setRemoveTarget] = useState<RosterEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ShiftModalState | null>(null);
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mBreak, setMBreak] = useState("");
  const [mError, setMError] = useState<string | null>(null);
  const [mSaving, setMSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const BREAK_OPTIONS = [
    { label: t("adminRoster.breakNone"), value: "" },
    { label: t("adminRoster.break15"), value: "15" },
    { label: t("adminRoster.break30"), value: "30" },
    { label: t("adminRoster.break45"), value: "45" },
    { label: t("adminRoster.break60"), value: "60" },
  ];

  const youLabel = `(${t("common.you")})`;

  const people = useMemo(
    () =>
      user
        ? [{ id: user.id, name: `${user.name} ${youLabel}`, hasAvatar: user.hasAvatar }, ...reports]
        : reports,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, reports],
  );

  function loadReports() {
    api.listReports().then(setReports).catch(() => {});
  }

  async function loadRoster() {
    if (!user) return;
    const targets = [{ id: user.id, name: `${user.name} ${youLabel}` }, ...reports];
    try {
      const lists = await Promise.all(
        targets.map((target) =>
          api
            .listShiftsForReport(target.id)
            .then((shifts) => shifts.map((s) => ({ ...s, employeeName: target.name }))),
        ),
      );
      setRoster(lists.flat());
    } catch {
      // ignore, keep last known roster
    }
  }

  useEffect(loadReports, []);
  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, user]);

  function openAdd(userId: number, userName: string, day: Date) {
    setModal({ mode: "add", userId, userName, day });
    setMStart(toDatetimeLocal(day, 9, 0));
    setMEnd(toDatetimeLocal(day, 17, 0));
    setMBreak("");
    setMError(null);
  }

  function openEdit(entry: RosterEntry) {
    setModal({ mode: "edit", entry });
    setMStart(toLocalInput(entry.startsAt));
    setMEnd(toLocalInput(entry.endsAt));
    setMBreak(entry.breakMinutes ? String(entry.breakMinutes) : "");
    setMError(null);
  }

  async function handleModalSave(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setMSaving(true);
    setMError(null);
    try {
      if (modal.mode === "add") {
        await api.createShiftForReport(modal.userId, {
          startsAt: toIso(mStart),
          endsAt: toIso(mEnd),
          breakMinutes: mBreak ? Number(mBreak) : undefined,
        });
      } else {
        await api.updateShiftForReport(modal.entry.userId, modal.entry.id, {
          startsAt: toIso(mStart),
          endsAt: toIso(mEnd),
          breakMinutes: mBreak ? Number(mBreak) : undefined,
        });
      }
      setModal(null);
      loadRoster();
    } catch (err) {
      setMError(err instanceof ApiError ? err.message : t("adminRoster.assignFailed"));
    } finally {
      setMSaving(false);
    }
  }

  function requestRemove(entry: RosterEntry) {
    setModal(null);
    setRemoveTarget(entry);
  }

  async function handleRemove(entry: RosterEntry) {
    setError(null);
    try {
      await api.deleteShiftForReport(entry.userId, entry.id);
      loadRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.removeShiftFailed"));
    } finally {
      setRemoveTarget(null);
    }
  }

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekLabel = `${weekStart.toLocaleDateString(getDateLocale(), { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString(getDateLocale(), { month: "short", day: "numeric", year: "numeric" })}`;

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const shiftsByPersonAndDay = useMemo(() => {
    const map = new Map<string, RosterEntry[]>();
    for (const s of roster) {
      const start = new Date(s.startsAt);
      if (start >= weekStart && start < weekEnd) {
        const key = `${s.userId}_${dateKey(start)}`;
        const existing = map.get(key) ?? [];
        existing.push(s);
        map.set(key, existing);
      }
    }
    return map;
  }, [roster, weekStart, weekEnd]);

  const today = dateKey(new Date());

  async function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      // Loaded on demand -- jsPDF pulls in a heavy html2canvas/dompurify
      // dependency chain that only a manager exporting the roster needs.
      const { downloadRosterPdf } = await import("../lib/rosterPdf");
      const dayHeaders = weekDays.map((d) =>
        d.toLocaleDateString(getDateLocale(), { weekday: "short", day: "numeric" }).toUpperCase(),
      );
      const emptyCellText = t("adminRoster.pdfEmptyCell");
      const rows = people.map((p) => ({
        name: p.name,
        cells: weekDays.map((d) => {
          const dayShifts = shiftsByPersonAndDay.get(`${p.id}_${dateKey(d)}`) ?? [];
          if (dayShifts.length === 0) return emptyCellText;
          return dayShifts
            .map((s) => `${compactTime(s.startsAt)}-${compactTime(s.endsAt)}`)
            .join("\n");
        }),
      }));
      const rangeSlug = `${weekStart.toISOString().slice(0, 10)}_to_${new Date(weekEnd.getTime() - 86400000).toISOString().slice(0, 10)}`;

      await downloadRosterPdf({
        businessName: user?.companyName,
        weekLabel: weekLabel,
        dayHeaders,
        rows,
        generatedByLine: t("adminRoster.pdfGeneratedBy", {
          date: new Date().toLocaleDateString(getDateLocale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          name: user?.name ?? "",
        }),
        employeeColumnLabel: t("adminRoster.pdfEmployeeColumn"),
        fileName: `Shiftline-Roster_${rangeSlug}.pdf`,
        emptyCellText,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>{t("adminRoster.title")}</h2>
      <p className="hint">{t("adminRoster.gridHint")}</p>
      {error && <div className="error">{error}</div>}

      <div className="roster-week-nav">
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() - 7);
              return d;
            })
          }
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="roster-week-label"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          {weekLabel}
        </button>
        <button
          type="button"
          className="roster-nav-btn"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w);
              d.setDate(d.getDate() + 7);
              return d;
            })
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {people.length > 0 && (
        <div className="roster-pdf-row">
          <button
            type="button"
            className="icon-btn"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
          >
            <FileDown size={14} />
            {pdfBusy ? t("adminRoster.generatingPdf") : t("adminRoster.downloadPdf")}
          </button>
        </div>
      )}

      {people.length === 0 ? (
        <p className="empty-state">{t("adminRoster.noEmployees")}</p>
      ) : (
        <div className="roster-grid-wrap">
          <table className="roster-grid">
            <thead>
              <tr>
                <th className="roster-grid-corner" />
                {weekDays.map((d) => (
                  <th
                    key={dateKey(d)}
                    className={dateKey(d) === today ? "today" : ""}
                  >
                    <span className="roster-grid-day-name">
                      {d.toLocaleDateString(getDateLocale(), { weekday: "short" })}
                    </span>
                    <span className="roster-grid-day-num">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <th className="roster-grid-person">
                    <span className="roster-grid-person-inner">
                      <Avatar userId={p.id} name={p.name} hasAvatar={p.hasAvatar} size={26} />
                      <span className="roster-grid-person-name">{p.name}</span>
                    </span>
                  </th>
                  {weekDays.map((d) => {
                    const cellShifts = shiftsByPersonAndDay.get(`${p.id}_${dateKey(d)}`) ?? [];
                    return (
                      <td key={dateKey(d)} className={dateKey(d) === today ? "today" : ""}>
                        {cellShifts.map((s) => (
                          <button
                            key={s.id}
                            className="roster-grid-chip"
                            onClick={() => openEdit(s)}
                            title={`${formatTime(s.startsAt)} – ${formatTime(s.endsAt)}${s.breakMinutes ? t("adminRoster.breakMinSuffix", { min: s.breakMinutes }) : ""}`}
                          >
                            {compactTime(s.startsAt)}-{compactTime(s.endsAt)}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="roster-grid-add"
                          onClick={() => openAdd(p.id, p.name, d)}
                          aria-label={t("adminRoster.quickAddTitle", { name: p.name })}
                        >
                          <Plus size={14} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {removeTarget && (
        <ConfirmDialog
          title={t("adminRoster.removeShiftQuestion")}
          message={t("adminRoster.removeShiftConfirm", {
            name: removeTarget.employeeName,
            date: new Date(removeTarget.startsAt).toLocaleDateString(getDateLocale()),
          })}
          confirmLabel={t("team.remove")}
          danger
          onConfirm={() => handleRemove(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {t("adminRoster.quickAddTitle", {
                name: modal.mode === "add" ? modal.userName : modal.entry.employeeName,
              })}
            </h3>
            <p className="hint">
              {(modal.mode === "add" ? modal.day : new Date(modal.entry.startsAt)).toLocaleDateString(
                getDateLocale(),
                { weekday: "long", month: "long", day: "numeric" },
              )}
            </p>
            <form onSubmit={handleModalSave}>
              <label className="field">
                <span className="field-label">{t("adminRoster.shiftStarts")}</span>
                <input
                  type="datetime-local"
                  value={mStart}
                  onChange={(e) => setMStart(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">{t("adminRoster.shiftEnds")}</span>
                <input
                  type="datetime-local"
                  value={mEnd}
                  onChange={(e) => setMEnd(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">{t("adminRoster.breakLabel")}</span>
                <select value={mBreak} onChange={(e) => setMBreak(e.target.value)}>
                  {BREAK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {mError && <div className="error">{mError}</div>}
              <div className="modal-actions">
                {modal.mode === "edit" && (
                  <button
                    type="button"
                    className="danger modal-action-detach"
                    onClick={() => requestRemove(modal.entry)}
                  >
                    {t("team.remove")}
                  </button>
                )}
                <button type="button" onClick={() => setModal(null)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={mSaving}>
                  {t("adminRoster.assign")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
