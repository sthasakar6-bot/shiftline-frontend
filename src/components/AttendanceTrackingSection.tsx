import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { api } from "../api/client";
import type { Attendance, UserSummary } from "../api/types";
import { formatTime, formatDuration } from "../lib/formatDate";
import { mapsUrl } from "../lib/geolocation";
import { useAuth } from "../auth/AuthContext";
import { getDateLocale } from "../i18n";
import Avatar from "./Avatar";

export default function AttendanceTrackingSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reports, setReports] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<Attendance[]>([]);

  const youLabel = `(${t("common.you")})`;
  const people = user
    ? [{ id: user.id, name: `${user.name} ${youLabel}`, hasAvatar: user.hasAvatar }, ...reports]
    : reports;

  useEffect(() => {
    api.listReports().then(setReports).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) {
      api.listAttendanceForReport(Number(selected)).then(setRecords).catch(() => {});
    } else {
      setRecords([]);
    }
  }, [selected]);

  const selectedPerson = people.find((p) => p.id === Number(selected));
  const sortedRecords = [...records].sort((a, b) => {
    const aTime = a.clockIn ? new Date(a.clockIn).getTime() : 0;
    const bTime = b.clockIn ? new Date(b.clockIn).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <section className="panel">
      <h2>{t("attendanceTracking.title")}</h2>
      <div className="inline-form">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("team.selectEmployee")}</option>
          {people.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selected && selectedPerson && (
        <div className="attendance-track-header">
          <Avatar
            userId={selectedPerson.id}
            name={selectedPerson.name}
            hasAvatar={selectedPerson.hasAvatar}
            size={30}
          />
          <span className="attendance-track-header-name">{selectedPerson.name}</span>
          <span className="attendance-track-header-count">
            {t("attendanceTracking.record", { count: sortedRecords.length })}
          </span>
        </div>
      )}

      {selected && (
        <ul className="attendance-track-rows">
          {sortedRecords.map((r) => (
            <li key={r.id} className="attendance-track-row">
              <div className="attendance-track-main">
                <span className="attendance-track-date">
                  {r.clockIn
                    ? new Date(r.clockIn).toLocaleDateString(getDateLocale(), {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : t("attendance.unknownDate")}
                </span>
                <span className="attendance-track-range">
                  {r.clockIn ? formatTime(r.clockIn) : "-"} –{" "}
                  {r.clockOut ? (
                    formatTime(r.clockOut)
                  ) : (
                    <span className="status-badge pending">{t("attendanceTracking.active")}</span>
                  )}
                  {r.clockIn && r.clockOut && (
                    <> · {formatDuration(new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime())}</>
                  )}
                </span>
              </div>
              {(r.clockInLat != null || r.clockOutLat != null) && (
                <div className="attendance-track-links">
                  {r.clockInLat != null && r.clockInLng != null && (
                    <a
                      className="attendance-track-map"
                      href={mapsUrl(r.clockInLat, r.clockInLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={11} /> {t("attendanceTracking.in")}
                    </a>
                  )}
                  {r.clockOutLat != null && r.clockOutLng != null && (
                    <a
                      className="attendance-track-map"
                      href={mapsUrl(r.clockOutLat, r.clockOutLng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={11} /> {t("attendanceTracking.out")}
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
          {sortedRecords.length === 0 && (
            <li className="leave-empty">{t("attendanceTracking.noRecords")}</li>
          )}
        </ul>
      )}
    </section>
  );
}
