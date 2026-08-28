import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Notification } from "../api/types";

export default function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function load() {
    api.listNotifications().then(setNotifications).catch(() => {});
  }

  useEffect(load, []);

  async function markRead(id: number) {
    await api.markNotificationRead(id);
    load();
  }

  return (
    <section className="panel">
      <h2>Notifications</h2>
      <ul className="list">
        {notifications.map((n) => (
          <li key={n.id} className={n.read ? "read" : "unread"}>
            <span>{n.message}</span>
            {!n.read && (
              <span className="actions">
                <button onClick={() => markRead(n.id)}>Mark read</button>
              </span>
            )}
          </li>
        ))}
        {notifications.length === 0 && <li className="empty">No notifications.</li>}
      </ul>
    </section>
  );
}
