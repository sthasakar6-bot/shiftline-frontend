import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ChatMessage } from "../api/types";

function wsUrl(): string {
  const token = getToken() ?? "";
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws/chat?token=${encodeURIComponent(token)}`;
}

// Mirrors the badge the notification bell already gets, but scoped to chat
// specifically -- a lightweight second WS connection (ChatSection opens its
// own, separately, only while that tab is mounted) that stays open for as
// long as the dashboard/admin shell is, so the tab badge keeps counting
// unread messages even while the user is on a different tab.
export function useChatUnread() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let socket: WebSocket | undefined;

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(wsUrl());
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type: string; message?: ChatMessage };
          if (data.type === "message" && data.message && data.message.userId !== userRef.current?.id) {
            setUnreadCount((c) => c + 1);
          }
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [user?.id]);

  const markRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { unreadCount, markRead };
}
