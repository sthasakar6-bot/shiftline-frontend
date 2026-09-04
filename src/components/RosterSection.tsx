import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

// Combines another day's date with the time-of-day from a datetime-local
// value, so "repeat on" days reuse the same start/end time picked once.
function withDate(datetimeLocal: string, day: Date): string {
  const timePart = datetimeLocal.split("T")[1] ?? "00:00";
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${timePart}`;
}

export default function RosterSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [assignee, setAssignee] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [repeatDays, setRepeatDays] = useState<Set<number>>(new Set());
  const [removeTarget, setRemoveTarget] = useState<RosterEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  function toggleRepeatDay(dow: number) {
    setRepeatDays((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const targetDays =
      repeatDays.size > 0 ? weekDays.filter((d) => repeatDays.has(d.getDay())) : null;

    try {
      if (!targetDays) {
        await api.createShiftForReport(Number(assignee), {
          startsAt: toIso(startsAt),
          endsAt: toIso(endsAt),
          breakMinutes: breakMinutes ? Number(breakMinutes) : undefined,
        });
        setMessage(t("adminRoster.shiftAssigned"));
      } else {
        const results = await Promise.allSettled(
          targetDays.map((day) =>
            api.createShiftForReport(Number(assignee), {
              startsAt: toIso(withDate(startsAt, day)),
              endsAt: toIso(withDate(endsAt, day)),
              breakMinutes: breakMinutes ? Number(breakMinutes) : undefined,
            }),
          ),
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failedDays = targetDays.filter((_, i) => results[i].status === "rejected");
        if (succeeded > 0) {
          setMessage(t("adminRoster.shiftsAssigned", { count: succeeded }));
        }
        if (failedDays.length > 0) {
          const dayNames = failedDays
            .map((d) => d.toLocaleDateString(getDateLocale(), { weekday: "short" }))
            .join(", ");
          setError(t("adminRoster.assignPartialFailed", { days: dayNames }));
        }
      }
      setStartsAt("");
      setEndsAt("");
      setBreakMinutes("");
      setRepeatDays(new Set());
      loadRoster();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("adminRoster.assignFailed"));
    }
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

  const shiftsThisWeek = [...shiftsByPersonAndDay.values()].reduce(
    (sum, list) => sum + list.length,
    0,
  );

  const today = dateKey(new Date());

  return (
    <section className="panel">
      <h2>{t("adminRoster.title")}</h2>

      <div className="subform">
        <h3>{t("adminRoster.assignShift")}</h3>
        <form className="inline-form" onSubmit={handleAssign}>
          <label className="field">
            <span className="field-label">{t("adminRoster.employeeLabel")}</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
              <option value="">{t("team.selectEmployee")}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.shiftStarts")}</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.shiftEnds")}</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">{t("adminRoster.breakLabel")}</span>
            <select value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)}>
              {BREAK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="field day-toggle-field">
            <span className="field-label">{t("adminRoster.repeatOn")}</span>
            <div className="day-toggle-row">
              {weekDays.map((d) => (
                <button
                  key={dateKey(d)}
                  type="button"
                  className={`day-toggle-btn${repeatDays.has(d.getDay()) ? " active" : ""}`}
                  onClick={() => toggleRepeatDay(d.getDay())}
                >
                  {d.toLocaleDateString(getDateLocale(), { weekday: "narrow" })}
                </button>
              ))}
              <button
                type="button"
                className="day-toggle-all"
                onClick={() =>
                  setRepeatDays((prev) =>
                    prev.size === 7 ? new Set() : new Set(weekDays.map((d) => d.getDay())),
                  )
                }
              >
                {t("adminRoster.wholeWeek")}
              </button>
            </div>
          </div>
          <button type="submit">{t("adminRoster.assign")}</button>
        </form>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </div>

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

      {people.length === 0 ? (
        <p className="empty-state">{t("adminRoster.noEmployees")}</p>
      ) : shiftsThisWeek === 0 ? (
        <p className="empty-state">{t("adminRoster.noShiftsWeek")}</p>
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
                            onClick={() => setRemoveTarget(s)}
                            title={`${formatTime(s.startsAt)} – ${formatTime(s.endsAt)}${s.breakMinutes ? t("adminRoster.breakMinSuffix", { min: s.breakMinutes }) : ""}`}
                          >
                            {compactTime(s.startsAt)}-{compactTime(s.endsAt)}
                          </button>
                        ))}
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
    </section>
  );
}
