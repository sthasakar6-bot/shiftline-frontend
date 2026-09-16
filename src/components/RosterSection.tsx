import { Fragment, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileDown,
  Settings,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Department, OpenShift, RosterEvent, RosterShift, ShiftType, TeamMember } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Avatar from "./Avatar";
import RosterConfigModal from "./RosterConfigModal";
import OpenShiftModal from "./OpenShiftModal";
import EventModal from "./EventModal";
import { formatTime, compactTime } from "../lib/formatDate";
import { getDateLocale } from "../i18n";
import {
  dateKey,
  startOfWeek,
  toDatetimeLocal,
  toIso,
  toLocalInput,
  getWeekNumber,
  weekStartFromNumber,
} from "../lib/rosterDates";

interface PersonEntry {
  id: number;
  name: string;
  hasAvatar: boolean;
  departmentId: number | null;
}

type ShiftModalState =
  | { mode: "add"; userId: number; userName: string; day: Date }
  | { mode: "edit"; entry: RosterShift };

type OpenShiftModalState =
  | { mode: "add"; day: Date; departmentId?: number }
  | { mode: "edit"; openShift: OpenShift };

type EventModalState = { mode: "add"; day: Date } | { mode: "edit"; event: RosterEvent };

export default function RosterSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [colleagues, setColleagues] = useState<TeamMember[]>([]);
  const [roster, setRoster] = useState<RosterShift[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [events, setEvents] = useState<RosterEvent[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [removeTarget, setRemoveTarget] = useState<RosterShift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ShiftModalState | null>(null);
  const [mStart, setMStart] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mBreak, setMBreak] = useState("");
  const [mShiftTypeId, setMShiftTypeId] = useState("");
  const [mError, setMError] = useState<string | null>(null);
  const [mSaving, setMSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [chooseWeekOpen, setChooseWeekOpen] = useState(false);
  const [chooseWeekValue, setChooseWeekValue] = useState("");
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [openShiftModal, setOpenShiftModal] = useState<OpenShiftModalState | null>(null);
  const [eventModal, setEventModal] = useState<EventModalState | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const BREAK_OPTIONS = [
    { label: t("adminRoster.breakNone"), value: "" },
    { label: t("adminRoster.break15"), value: "15" },
    { label: t("adminRoster.break30"), value: "30" },
    { label: t("adminRoster.break45"), value: "45" },
    { label: t("adminRoster.break60"), value: "60" },
  ];

  const youLabel = `(${t("common.you")})`;

  const people = useMemo<PersonEntry[]>(
    () =>
      user
        ? [
            {
              id: user.id,
              name: `${user.name} ${youLabel}`,
              hasAvatar: user.hasAvatar,
              departmentId: user.departmentId,
            },
            ...colleagues.map((c) => ({
              id: c.id,
              name: c.name,
              hasAvatar: c.hasAvatar,
              departmentId: c.departmentId,
            })),
          ]
        : colleagues.map((c) => ({
            id: c.id,
            name: c.name,
            hasAvatar: c.hasAvatar,
            departmentId: c.departmentId,
          })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, colleagues],
  );

  function loadColleagues() {
    // Any manager can set shifts for anyone in the company (not just their
    // own direct reports), so the roster picker uses the full team
    // directory rather than a managerId-scoped list.
    api
      .listTeam()
      .then((team) => setColleagues(team.filter((m) => m.id !== user?.id)))
      .catch(() => {});
  }

  function loadRoster() {
    api
      .listCompanyRoster()
      .then(setRoster)
      .catch(() => {});
  }

  function loadDepartments() {
    api.listDepartments().then(setDepartments).catch(() => {});
  }

  function loadShiftTypes() {
    api.listShiftTypes().then(setShiftTypes).catch(() => {});
  }

  function loadOpenShifts() {
    api.listOpenShifts().then(setOpenShifts).catch(() => {});
  }

  function loadEvents() {
    api.listEvents().then(setEvents).catch(() => {});
  }

  useEffect(loadColleagues, [user?.id]);
  useEffect(loadRoster, []);
  useEffect(loadDepartments, []);
  useEffect(loadShiftTypes, []);
  useEffect(loadOpenShifts, []);
  useEffect(loadEvents, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const shiftTypeById = useMemo(() => new Map(shiftTypes.map((s) => [s.id, s])), [shiftTypes]);

  function openAdd(userId: number, userName: string, day: Date) {
    setModal({ mode: "add", userId, userName, day });
    setMStart(toDatetimeLocal(day, 9, 0));
    setMEnd(toDatetimeLocal(day, 17, 0));
    setMBreak("");
    setMShiftTypeId("");
    setMError(null);
  }

  function openEdit(entry: RosterShift) {
    setModal({ mode: "edit", entry });
    setMStart(toLocalInput(entry.startsAt));
    setMEnd(toLocalInput(entry.endsAt));
    setMBreak(entry.breakMinutes ? String(entry.breakMinutes) : "");
    setMShiftTypeId(entry.shiftTypeId ? String(entry.shiftTypeId) : "");
    setMError(null);
  }

  async function handleModalSave(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setMSaving(true);
    setMError(null);
    try {
      const shiftTypeId = mShiftTypeId ? Number(mShiftTypeId) : undefined;
      if (modal.mode === "add") {
        await api.createShiftForReport(modal.userId, {
          startsAt: toIso(mStart),
          endsAt: toIso(mEnd),
          breakMinutes: mBreak ? Number(mBreak) : undefined,
          shiftTypeId,
        });
      } else {
        await api.updateShiftForReport(modal.entry.userId, modal.entry.id, {
          startsAt: toIso(mStart),
          endsAt: toIso(mEnd),
          breakMinutes: mBreak ? Number(mBreak) : undefined,
          shiftTypeId: shiftTypeId ?? null,
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

  function requestRemove(entry: RosterShift) {
    setModal(null);
    setRemoveTarget(entry);
  }

  async function handleRemove(entry: RosterShift) {
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
  const weekNumber = useMemo(() => getWeekNumber(weekStart), [weekStart]);

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
    const map = new Map<string, RosterShift[]>();
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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, RosterEvent[]>();
    for (const ev of events) {
      const start = new Date(ev.startsAt);
      if (start >= weekStart && start < weekEnd) {
        const key = dateKey(start);
        const existing = map.get(key) ?? [];
        existing.push(ev);
        map.set(key, existing);
      }
    }
    return map;
  }, [events, weekStart, weekEnd]);

  const openShiftsByGroupAndDay = useMemo(() => {
    const map = new Map<string, OpenShift[]>();
    for (const os of openShifts) {
      const start = new Date(os.startsAt);
      if (start >= weekStart && start < weekEnd) {
        const groupKey = os.departmentId ?? "none";
        const key = `${groupKey}_${dateKey(start)}`;
        const existing = map.get(key) ?? [];
        existing.push(os);
        map.set(key, existing);
      }
    }
    return map;
  }, [openShifts, weekStart, weekEnd]);

  // Groups employees (and their open shifts) by department, sorted by
  // Department.order, with a trailing "Unassigned" group -- dropped entirely
  // when nothing falls into it, so companies with no departments configured
  // yet just see one flat list, matching the pre-department behavior.
  const departmentGroups = useMemo(() => {
    type Group = { department: Department | null; people: PersonEntry[] };
    const groups = new Map<number | "none", Group>();
    for (const dept of [...departments].sort((a, b) => a.order - b.order)) {
      groups.set(dept.id, { department: dept, people: [] });
    }
    groups.set("none", { department: null, people: [] });
    for (const p of people) {
      const key = p.departmentId ?? "none";
      if (!groups.has(key)) groups.set(key, { department: null, people: [] });
      groups.get(key)!.people.push(p);
    }
    const hasAnyOpenShiftInGroup = (key: number | "none") =>
      openShifts.some((os) => (os.departmentId ?? "none") === key);
    return Array.from(groups.entries())
      .filter(
        ([key, g]) => g.department !== null || g.people.length > 0 || hasAnyOpenShiftInGroup(key),
      )
      .map(([key, g]) => ({ key, ...g }));
  }, [departments, people, openShifts]);

  const today = dateKey(new Date());

  function openAddOpenShift(day: Date, departmentId?: number) {
    setOpenShiftModal({ mode: "add", day, departmentId });
  }

  function openEditOpenShift(openShift: OpenShift) {
    setOpenShiftModal({ mode: "edit", openShift });
  }

  function handleOpenShiftSaved() {
    setOpenShiftModal(null);
    loadOpenShifts();
    loadRoster();
  }

  function handleEventSaved() {
    setEventModal(null);
    loadEvents();
  }

  function weekLabelFor(start: Date): string {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(getDateLocale(), { month: "short", day: "numeric" })} – ${end.toLocaleDateString(getDateLocale(), { month: "short", day: "numeric", year: "numeric" })}`;
  }

  // Builds one PDF table section for an arbitrary week -- not just the
  // currently-displayed one -- since a month export needs several weeks at
  // once and "choose week" needs a week that isn't on screen at all. Reads
  // straight from the full `roster` array (loaded once, unscoped by date)
  // rather than the memoized shiftsByPersonAndDay, which is deliberately
  // only built for the on-screen week.
  function buildSection(start: Date, emptyCellText: string) {
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const dayHeaders = days.map((d) =>
      d.toLocaleDateString(getDateLocale(), { weekday: "short", day: "numeric" }).toUpperCase(),
    );
    const byPersonAndDay = new Map<string, RosterShift[]>();
    for (const s of roster) {
      const shiftStart = new Date(s.startsAt);
      if (shiftStart >= start && shiftStart < end) {
        const key = `${s.userId}_${dateKey(shiftStart)}`;
        const existing = byPersonAndDay.get(key) ?? [];
        existing.push(s);
        byPersonAndDay.set(key, existing);
      }
    }
    const rows = people.map((p) => ({
      name: p.name,
      cells: days.map((d) => {
        const dayShifts = byPersonAndDay.get(`${p.id}_${dateKey(d)}`) ?? [];
        if (dayShifts.length === 0) return emptyCellText;
        return dayShifts.map((s) => `${compactTime(s.startsAt)}-${compactTime(s.endsAt)}`).join("\n");
      }),
    }));
    return { label: weekLabelFor(start), dayHeaders, rows };
  }

  async function exportPdf(title: string, sections: { label: string; dayHeaders: string[]; rows: { name: string; cells: string[] }[] }[], fileSlug: string) {
    setPdfBusy(true);
    setPdfMenuOpen(false);
    try {
      // Loaded on demand -- jsPDF pulls in a heavy html2canvas/dompurify
      // dependency chain that only a manager exporting the roster needs.
      const { downloadRosterPdf } = await import("../lib/rosterPdf");
      await downloadRosterPdf({
        businessName: user?.companyName,
        title,
        sections,
        generatedByLine: t("adminRoster.pdfGeneratedBy", {
          date: new Date().toLocaleDateString(getDateLocale(), {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          name: user?.name ?? "",
        }),
        employeeColumnLabel: t("adminRoster.pdfEmployeeColumn"),
        fileName: `Shiftline-Roster_${fileSlug}.pdf`,
        emptyCellText: t("adminRoster.pdfEmptyCell"),
      });
    } finally {
      setPdfBusy(false);
    }
  }

  function handleDownloadWeek() {
    const emptyCellText = t("adminRoster.pdfEmptyCell");
    const section = buildSection(weekStart, emptyCellText);
    const rangeSlug = `${weekStart.toISOString().slice(0, 10)}_to_${new Date(weekEnd.getTime() - 86400000).toISOString().slice(0, 10)}`;
    exportPdf(t("adminRoster.pdfWeeklyTitle"), [section], rangeSlug);
  }

  function handleDownloadMonth() {
    const emptyCellText = t("adminRoster.pdfEmptyCell");
    const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 1);
    const sections = [];
    for (let cursor = startOfWeek(monthStart); cursor < monthEnd; ) {
      sections.push(buildSection(new Date(cursor), emptyCellText));
      cursor.setDate(cursor.getDate() + 7);
    }
    const monthTitle = monthStart.toLocaleDateString(getDateLocale(), { month: "long", year: "numeric" });
    const monthSlug = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    exportPdf(monthTitle, sections, monthSlug);
  }

  function handleDownloadChosenWeek(e: FormEvent) {
    e.preventDefault();
    const n = Number(chooseWeekValue);
    if (!n || n < 1 || n > 53) return;
    const chosenStart = weekStartFromNumber(weekStart.getFullYear(), n);
    const emptyCellText = t("adminRoster.pdfEmptyCell");
    const section = buildSection(chosenStart, emptyCellText);
    exportPdf(t("adminRoster.pdfWeeklyTitle"), [section], `week-${n}_${weekStart.getFullYear()}`);
    setChooseWeekOpen(false);
    setChooseWeekValue("");
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuOpen(false);
        setChooseWeekOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const body = (
    <>
      <div className="roster-toolbar">
        <div className="roster-week-nav">
          <span className="roster-week-number">{t("adminRoster.weekNumber", { n: weekNumber })}</span>
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
        <div className="roster-toolbar-actions">
          {people.length > 0 && (
            <div className="pdf-menu-wrap" ref={pdfMenuRef}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPdfMenuOpen((v) => !v)}
                disabled={pdfBusy}
              >
                <FileDown size={14} />
                {pdfBusy ? t("adminRoster.generatingPdf") : t("adminRoster.downloadPdf")}
              </button>
              {pdfMenuOpen && (
                <div className="pdf-menu">
                  <button type="button" onClick={handleDownloadWeek}>
                    {t("adminRoster.pdfThisWeek")}
                  </button>
                  <button type="button" onClick={handleDownloadMonth}>
                    {t("adminRoster.pdfThisMonth")}
                  </button>
                  <button type="button" onClick={() => setChooseWeekOpen(true)}>
                    {t("adminRoster.pdfChooseWeek")}
                  </button>
                  {chooseWeekOpen && (
                    <form className="pdf-menu-choose-week" onSubmit={handleDownloadChosenWeek}>
                      <input
                        type="number"
                        min={1}
                        max={53}
                        placeholder={t("adminRoster.pdfWeekNumberPlaceholder")}
                        value={chooseWeekValue}
                        onChange={(e) => setChooseWeekValue(e.target.value)}
                        autoFocus
                      />
                      <button type="submit">{t("adminRoster.pdfGo")}</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
          <button type="button" className="icon-btn" onClick={() => setConfigOpen(true)}>
            <Settings size={14} />
            {t("adminRoster.manage")}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? t("adminRoster.fullscreenExit") : t("adminRoster.fullscreenEnter")}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {shiftTypes.length > 0 && (
        <div className="roster-legend">
          {shiftTypes.map((s) => (
            <span key={s.id} className="roster-legend-item">
              <span className="roster-legend-swatch" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {people.length === 0 ? (
        <p className="empty-state">{t("adminRoster.noEmployees")}</p>
      ) : (
        <div className="roster-grid-wrap">
          <table className="roster-grid">
            <thead>
              <tr>
                <th className="roster-grid-corner" />
                {weekDays.map((d) => (
                  <th key={dateKey(d)} className={dateKey(d) === today ? "today" : ""}>
                    <span className="roster-grid-day-name">
                      {d.toLocaleDateString(getDateLocale(), { weekday: "short" })}
                    </span>
                    <span className="roster-grid-day-num">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="roster-events-row">
                <th className="roster-grid-corner roster-events-label">{t("adminRoster.eventsRow")}</th>
                {weekDays.map((d) => {
                  const dayEvents = eventsByDay.get(dateKey(d)) ?? [];
                  return (
                    <td key={dateKey(d)} className={dateKey(d) === today ? "today" : ""}>
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          className="roster-event-pill"
                          onClick={() => setEventModal({ mode: "edit", event: ev })}
                        >
                          {ev.title}
                          {ev.endsAt && (
                            <span className="roster-event-pill-time">
                              {compactTime(ev.startsAt)}-{compactTime(ev.endsAt)}
                            </span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="roster-grid-add"
                        onClick={() => setEventModal({ mode: "add", day: d })}
                        aria-label={t("adminRoster.addEvent")}
                      >
                        <Plus size={14} />
                      </button>
                    </td>
                  );
                })}
              </tr>

              {departmentGroups.map((group) => (
                <Fragment key={group.key}>
                  {group.department && (
                    <tr className="roster-dept-row">
                      <td className="roster-grid-corner" colSpan={weekDays.length + 1}>
                        <span className="roster-dept-bar" style={{ background: group.department.color }} />
                        {group.department.name}
                      </td>
                    </tr>
                  )}
                  <tr className="roster-open-row">
                    <th className="roster-grid-corner roster-open-label">
                      {t("adminRoster.openShiftsRow")}
                    </th>
                    {weekDays.map((d) => {
                      const key = `${group.key}_${dateKey(d)}`;
                      const dayOpenShifts = openShiftsByGroupAndDay.get(key) ?? [];
                      return (
                        <td key={dateKey(d)} className={dateKey(d) === today ? "today" : ""}>
                          {dayOpenShifts.map((os) => (
                            <button
                              key={os.id}
                              className="roster-open-chip"
                              style={
                                os.shiftTypeId
                                  ? { borderColor: shiftTypeById.get(os.shiftTypeId)?.color }
                                  : undefined
                              }
                              onClick={() => openEditOpenShift(os)}
                            >
                              {compactTime(os.startsAt)}-{compactTime(os.endsAt)}
                              <span className="roster-open-chip-count">
                                {os.filledCount}/{os.requiredCount}
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="roster-grid-add"
                            onClick={() =>
                              openAddOpenShift(d, group.department ? group.department.id : undefined)
                            }
                            aria-label={t("adminRoster.addOpenShift")}
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {group.people.map((p) => (
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
                                style={{
                                  background: s.shiftTypeId
                                    ? shiftTypeById.get(s.shiftTypeId)?.color
                                    : undefined,
                                }}
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {removeTarget && (
        <ConfirmDialog
          title={t("adminRoster.removeShiftQuestion")}
          message={t("adminRoster.removeShiftConfirm", {
            name: removeTarget.userName,
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
                name: modal.mode === "add" ? modal.userName : modal.entry.userName,
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
              {shiftTypes.length > 0 && (
                <label className="field">
                  <span className="field-label">{t("adminRoster.shiftTypeLabel")}</span>
                  <select value={mShiftTypeId} onChange={(e) => setMShiftTypeId(e.target.value)}>
                    <option value="">{t("adminRoster.shiftTypeNone")}</option>
                    {shiftTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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

      {configOpen && (
        <RosterConfigModal
          departments={departments}
          shiftTypes={shiftTypes}
          onClose={() => setConfigOpen(false)}
          onChanged={() => {
            loadDepartments();
            loadShiftTypes();
          }}
        />
      )}

      {openShiftModal && (
        <OpenShiftModal
          state={openShiftModal}
          departments={departments}
          shiftTypes={shiftTypes}
          people={colleagues.concat(
            user
              ? [
                  {
                    id: user.id,
                    name: `${user.name} ${youLabel}`,
                    role: "manager",
                    hasAvatar: user.hasAvatar,
                    location: user.location,
                    departmentId: user.departmentId,
                  },
                ]
              : [],
          )}
          onClose={() => setOpenShiftModal(null)}
          onSaved={handleOpenShiftSaved}
        />
      )}

      {eventModal && (
        <EventModal state={eventModal} onClose={() => setEventModal(null)} onSaved={handleEventSaved} />
      )}
    </>
  );

  if (fullscreen) {
    return createPortal(
      <div className="roster-fullscreen">
        <h2 className="roster-fullscreen-title">{t("adminRoster.title")}</h2>
        {body}
      </div>,
      document.body,
    );
  }

  return (
    <section className="panel">
      <h2>{t("adminRoster.title")}</h2>
      {body}
    </section>
  );
}
