import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Notification } from "../api/types";

export default function NotificationsSection({
  notifications,
  onReload,
}: {
  notifications: Notification[];
  onReload: () => void;
}) {
  const navigate = useNavigate();

  async function markRead(id: number) {
    await api.markNotificationRead(id);
    onReload();
  }

  async function markAllRead() {
    await api.markAllNotificationsRead();
    onReload();
  }

  async function remove(id: number) {
    await api.deleteNotification(id);
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

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <section className="panel">
      <h2>Notifications</h2>
      {hasUnread && (
        <div className="inline-form">
          <button onClick={markAllRead}>Mark all as read</button>
        </div>
      )}
      <ul className="list">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={n.read ? "read" : "unread"}
            onClick={() => handleOpen(n)}
            style={{ cursor: "pointer" }}
          >
            <span>{n.message}</span>
            <span className="actions">
              {!n.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markRead(n.id);
                  }}
                >
                  Mark read
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n.id);
                }}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
        {notifications.length === 0 && <li className="empty">No notifications.</li>}
      </ul>
    </section>
  );
}
