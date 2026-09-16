import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Smile } from "lucide-react";
import { api, ApiError, API_URL, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import type { ChatMessage } from "../api/types";

function wsUrl(): string {
  const token = getToken() ?? "";
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws/chat?token=${encodeURIComponent(token)}`;
}

// A small curated set rather than a full emoji library/dependency -- this
// is a work-scheduling team chat, not a general messenger, so a handful of
// common reactions covers the realistic use case without adding bundle
// weight for a searchable thousands-of-emoji picker.
const EMOJI_OPTIONS = [
  "👍", "🙏", "😀", "😂", "❤️", "🎉", "👏", "🔥",
  "✅", "👌", "😅", "😢", "😮", "🤔", "💪", "☕",
];

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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!emojiOpen) return;
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [emojiOpen]);

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const cursor = start + emoji.length;
      el?.setSelectionRange(cursor, cursor);
    });
  }

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
          const data = JSON.parse(event.data) as
            | { type: "message"; message: ChatMessage }
            | { type: "message_deleted"; id: number };
          if (data.type === "message") {
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "message_deleted") {
            setMessages((prev) => prev.filter((m) => m.id !== data.id));
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

  async function handleDelete(id: number) {
    // No local removal here -- the server's own WS broadcast (which the
    // deleter's socket also receives) is what actually takes it off screen,
    // same single-source-of-truth reasoning as sending.
    try {
      await api.deleteMessage(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("chat.deleteFailed"));
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
                {!isMine && (
                  <Avatar userId={m.userId} name={m.userName} hasAvatar={m.hasAvatar} size={28} />
                )}
                <div className="chat-bubble">
                  {!isMine && <div className="chat-bubble-author">{m.userName}</div>}
                  <div className="chat-bubble-body">{m.body}</div>
                  <div className="chat-bubble-time">{formatTime(m.createdAt)}</div>
                </div>
                {isMine && (
                  <button
                    type="button"
                    className="chat-delete-btn"
                    onClick={() => handleDelete(m.id)}
                    title={t("chat.delete")}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        <div className="chat-emoji-wrap" ref={emojiPickerRef}>
          <button
            type="button"
            className="chat-emoji-btn"
            onClick={() => setEmojiOpen((v) => !v)}
            title={t("chat.emoji")}
          >
            <Smile size={18} />
          </button>
          {emojiOpen && (
            <div className="chat-emoji-picker">
              {EMOJI_OPTIONS.map((emoji) => (
                <button type="button" key={emoji} onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
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
