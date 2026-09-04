import { type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Palmtree, Watch, KeyRound, Bell, X } from "lucide-react";
import { api } from "../api/client";
import type { Notification } from "../api/types";
import { formatRelativeTime } from "../lib/formatDate";

function iconForNotification(n: Notification): ComponentType<{ size?: number }> {
  const text = `${n.message} ${n.url ?? ""}`.toLowerCase();
  if (text.includes("shift")) return CalendarDays;
  if (text.includes("leave") || text.includes("vacation") || text.includes("sick")) return Palmtree;
  if (text.includes("clock")) return Watch;
  if (text.includes("password")) return KeyRound;
  return Bell;
}

export default function NotificationsSection({
  notifications,
  onReload,
}: {
  notifications: Notification[];
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function markAllRead() {
    await api.markAllNotificationsRead();
    onReload();
  }

  async function remove(id: number) {
    await api.deleteNotification(id);
    onReload();
  }

  async function removeAll() {
    await Promise.all(notifications.map((n) => api.deleteNotification(n.id)));
    onReload();
  }

  async function handleOpen(n: Notification) {
    if (!n.read) {
      await api.markNotificationRead(n.id);
      onReload();
    }
    if (n.url) {
      navigate(n.url);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <section className="panel">
      <div className="notif-banner">
        <div className="notif-banner-title">
          <h2>{t("notifications.title")}</h2>
          {unreadCount > 0 && <span className="notif-count-badge">{unreadCount}</span>}
        </div>
        {notifications.length > 0 && (
          <div className="notif-banner-actions">
            {unreadCount > 0 && <button onClick={markAllRead}>{t("notifications.markAllRead")}</button>}
            <button onClick={removeAll}>{t("notifications.clearAll")}</button>
          </div>
        )}
      </div>

      <ul className="notif-list">
        {notifications.map((n) => {
          const Icon = iconForNotification(n);
          return (
            <li
              key={n.id}
              className={`notif-row${n.read ? "" : " unread"}`}
              onClick={() => handleOpen(n)}
            >
              <span className="notif-icon">
                <Icon size={18} />
              </span>
              <div className="notif-body">
                <span className="notif-message">{n.message}</span>
                <span className="notif-time">{formatRelativeTime(n.createdAt)}</span>
              </div>
              {!n.read && <span className="notif-dot" />}
              <button
                className="notif-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n.id);
                }}
                title={t("notifications.delete")}
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
        {notifications.length === 0 && <li className="empty">{t("notifications.empty")}</li>}
      </ul>
    </section>
  );
}
