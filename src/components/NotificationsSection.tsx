import { api } from "../api/client";
import type { Notification } from "../api/types";

export default function NotificationsSection({
  notifications,
  onReload,
}: {
  notifications: Notification[];
  onReload: () => void;
}) {
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
          <li key={n.id} className={n.read ? "read" : "unread"}>
            <span>{n.message}</span>
            <span className="actions">
              {!n.read && <button onClick={() => markRead(n.id)}>Mark read</button>}
              <button onClick={() => remove(n.id)}>Delete</button>
            </span>
          </li>
        ))}
        {notifications.length === 0 && <li className="empty">No notifications.</li>}
      </ul>
    </section>
  );
}
