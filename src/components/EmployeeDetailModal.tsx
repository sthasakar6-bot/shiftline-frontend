import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Mail, Phone, MapPin, Building2 } from "lucide-react";
import Avatar from "./Avatar";
import { api, ApiError } from "../api/client";
import type { UserSummary } from "../api/types";

export default function EmployeeDetailModal({
  employee,
  onClose,
  onLocationChanged,
}: {
  employee: UserSummary;
  onClose: () => void;
  onLocationChanged?: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<"email" | "phone" | "address" | null>(null);
  const [locationInput, setLocationInput] = useState(employee.location ?? "");
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function handleCopy(field: "email" | "phone" | "address", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
    });
  }

  async function handleSaveLocation() {
    setLocationError(null);
    setSavingLocation(true);
    try {
      await api.setEmployeeLocation(employee.id, locationInput.trim() || null);
      onLocationChanged?.();
    } catch (err) {
      setLocationError(err instanceof ApiError ? err.message : t("employeeDetail.locationSaveFailed"));
    } finally {
      setSavingLocation(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal employee-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="employee-detail-header">
          <Avatar userId={employee.id} name={employee.name} hasAvatar={employee.hasAvatar} size={64} />
          <h3>{employee.name}</h3>
          <span className={`presence-badge${employee.online ? " online" : ""}`}>
            <span className="presence-dot" />
            {employee.online ? t("employeeDetail.onlineNow") : t("employeeDetail.offline")}
          </span>
        </div>

        <div className="employee-detail-rows">
          <div className="employee-detail-row">
            <Mail size={16} className="employee-detail-icon" />
            <span className="employee-detail-value">{employee.email}</span>
            <button
              type="button"
              className="employee-detail-copy"
              onClick={() => handleCopy("email", employee.email)}
              title={t("employeeDetail.copyEmail")}
            >
              {copied === "email" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="employee-detail-row">
            <Phone size={16} className="employee-detail-icon" />
            {employee.phone ? (
              <>
                <span className="employee-detail-value">{employee.phone}</span>
                <button
                  type="button"
                  className="employee-detail-copy"
                  onClick={() => handleCopy("phone", employee.phone as string)}
                  title={t("employeeDetail.copyPhone")}
                >
                  {copied === "phone" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </>
            ) : (
              <span className="employee-detail-value muted">{t("employeeDetail.noPhone")}</span>
            )}
          </div>
          <div className="employee-detail-row">
            <MapPin size={16} className="employee-detail-icon" />
            {employee.address ? (
              <>
                <span className="employee-detail-value">{employee.address}</span>
                <button
                  type="button"
                  className="employee-detail-copy"
                  onClick={() => handleCopy("address", employee.address as string)}
                  title={t("employeeDetail.copyAddress")}
                >
                  {copied === "address" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </>
            ) : (
              <span className="employee-detail-value muted">{t("employeeDetail.noAddress")}</span>
            )}
          </div>
          <div className="employee-detail-row">
            <Building2 size={16} className="employee-detail-icon" />
            <input
              className="employee-detail-location-input"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder={t("employeeDetail.locationPlaceholder")}
            />
            <button type="button" onClick={handleSaveLocation} disabled={savingLocation}>
              {savingLocation ? t("common.save") + "…" : t("common.save")}
            </button>
          </div>
          {locationError && <div className="error">{locationError}</div>}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  );
}
