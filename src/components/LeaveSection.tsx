import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LeaveRequest } from "../api/types";
import { formatDateOnly } from "../lib/dateOnly";
import DateRangePicker from "./DateRangePicker";

export default function LeaveSection() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [type, setType] = useState<"vacation" | "sick">("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listLeaveRequests().then(setRequests).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createLeaveRequest({
        type,
        startDate,
        endDate: endDate || startDate,
        reason: reason || undefined,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("leave.requestFailed"));
    }
  }

  async function handleCancel(id: number) {
    try {
      await api.cancelLeaveRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("leave.cancelFailed"));
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.cancelLeaveRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("leave.deleteFailed"));
    }
  }

  async function handleClearAll() {
    setError(null);
    try {
      await Promise.all(
        clearable.map((r) => api.cancelLeaveRequest(r.id).catch(() => {})),
      );
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("leave.clearAllFailed"));
    }
  }

  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const clearable = sortedRequests.filter((r) => r.status === "rejected" || r.status === "cancelled");

  return (
    <section className="panel">
      <div className="notif-banner">
        <div className="notif-banner-title">
          <h2>{t("leave.title")}</h2>
        </div>
        {clearable.length > 0 && (
          <div className="notif-banner-actions">
            <button onClick={handleClearAll}>{t("leave.clearAll")}</button>
          </div>
        )}
      </div>

      <div className="subform">
        <h3>{t("leave.requestLeave")}</h3>
        <form className="inline-form" onSubmit={handleCreate}>
          <label className="field">
            <span className="field-label">{t("leave.type")}</span>
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value as "vacation" | "sick";
                setType(next);
                if (next === "sick" && startDate) setEndDate(startDate);
              }}
            >
              <option value="vacation">{t("leave.vacation")}</option>
              <option value="sick">{t("leave.sick")}</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">{type === "vacation" ? t("leave.dates") : t("leave.date")}</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              singleDay={type === "sick"}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">
              {t("leave.reason")} ({t("common.optional")})
            </span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button type="submit" disabled={!startDate}>
            {t("leave.request")}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <ul className="list">
        {sortedRequests.map((r) => (
          <li key={r.id}>
            <span>
              <span className={`type-badge ${r.type}`}>{t(`leave.${r.type}`)}</span>{" "}
              <span className={`status-badge ${r.status}`}>{t(`leave.${r.status}`)}</span>
              <br />
              {formatDateOnly(r.startDate)} → {formatDateOnly(r.endDate)}
              {r.reason && <> · {r.reason}</>}
            </span>
            {r.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCancel(r.id)}>{t("common.cancel")}</button>
              </span>
            )}
            {(r.status === "rejected" || r.status === "cancelled") && (
              <span className="actions">
                <button onClick={() => handleDelete(r.id)}>{t("leave.delete")}</button>
              </span>
            )}
          </li>
        ))}
        {sortedRequests.length === 0 && <li className="empty">{t("leave.noRequests")}</li>}
      </ul>
    </section>
  );
}
