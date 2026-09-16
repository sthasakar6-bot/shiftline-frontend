import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, API_URL, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ChatMessage } from "../api/types";

function wsUrl(): string {
  const token = getToken() ?? "";
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws/chat?token=${encodeURIComponent(token)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api
      .getMessages()
      .then(setMessages)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("chat.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  // Send happens over the authenticated REST endpoint; this socket is a
  // read-only push channel -- the server broadcasts every new message
  // (including the sender's own) back over it, so a plain POST -> WS-push
  // round trip is the single source of truth with no optimistic-append
  // bookkeeping to get wrong.
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (cancelled) return;
      const socket = new WebSocket(wsUrl());
      socketRef.current = socket;
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type: string; message: ChatMessage };
          if (data.type === "message") {
            setMessages((prev) => [...prev, data.message]);
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
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMessage(body);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel chat-panel">
      <h2>{t("chat.title")}</h2>
      {error && <div className="error">{error}</div>}

      <div className="chat-messages">
        {loading ? (
          <p className="hint">{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="hint">{t("chat.empty")}</p>
        ) : (
          messages.map((m) => {
            const isMine = m.userId === user?.id;
            return (
              <div key={m.id} className={`chat-bubble-row ${isMine ? "chat-bubble-row-mine" : ""}`}>
                <div className="chat-bubble">
                  {!isMine && <div className="chat-bubble-author">{m.userName}</div>}
                  <div className="chat-bubble-body">{m.body}</div>
                  <div className="chat-bubble-time">{formatTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder")}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !draft.trim()}>
          {t("chat.send")}
        </button>
      </form>
    </section>
  );
}
