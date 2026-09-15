import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Department, ShiftType } from "../api/types";
import ConfirmDialog from "./ConfirmDialog";

type Tab = "departments" | "shiftTypes";

interface ConfigItem {
  id: number;
  name: string;
  color: string;
  order: number;
}

export default function RosterConfigModal({
  departments,
  shiftTypes,
  onClose,
  onChanged,
}: {
  departments: Department[];
  shiftTypes: ShiftType[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("departments");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ConfigItem | null>(null);

  const items: ConfigItem[] = tab === "departments" ? departments : shiftTypes;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (tab === "departments") {
        await api.createDepartment({ name, color });
      } else {
        await api.createShiftType({ name, color });
      }
      setName("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("rosterConfig.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ConfigItem) {
    setRemoveTarget(null);
    setError(null);
    try {
      if (tab === "departments") {
        await api.deleteDepartment(item.id);
      } else {
        await api.deleteShiftType(item.id);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("rosterConfig.deleteFailed"));
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal roster-config-modal" onClick={(e) => e.stopPropagation()}>
          <h3>{t("rosterConfig.title")}</h3>
          <div className="roster-config-tabs">
            <button
              type="button"
              className={tab === "departments" ? "active" : ""}
              onClick={() => setTab("departments")}
            >
              {t("rosterConfig.departmentsTab")}
            </button>
            <button
              type="button"
              className={tab === "shiftTypes" ? "active" : ""}
              onClick={() => setTab("shiftTypes")}
            >
              {t("rosterConfig.shiftTypesTab")}
            </button>
          </div>

          <ul className="roster-config-list">
            {items.map((item) => (
              <li key={item.id} className="roster-config-item">
                <span className="roster-config-swatch" style={{ background: item.color }} />
                <span className="roster-config-name">{item.name}</span>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => setRemoveTarget(item)}
                  aria-label={t("team.remove")}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="empty-state">{t("rosterConfig.empty")}</li>}
          </ul>

          <form onSubmit={handleAdd} className="roster-config-form">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                tab === "departments"
                  ? t("rosterConfig.addDepartment")
                  : t("rosterConfig.addShiftType")
              }
              required
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="roster-config-color-input"
              aria-label={t("rosterConfig.colorLabel")}
            />
            <button type="submit" disabled={saving}>
              {t("rosterConfig.addButton")}
            </button>
          </form>
          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button onClick={onClose}>{t("common.close")}</button>
          </div>
        </div>
      </div>

      {removeTarget && (
        <ConfirmDialog
          title={t("rosterConfig.deleteConfirmTitle")}
          message={t("rosterConfig.deleteConfirmMessage", { name: removeTarget.name })}
          confirmLabel={t("team.remove")}
          danger
          onConfirm={() => handleDelete(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </>
  );
}
