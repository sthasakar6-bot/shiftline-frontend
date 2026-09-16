import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Check, X } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { AssistantChatTurn, AssistantProposedShift } from "../api/types";

interface DisplayTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedShifts?: AssistantProposedShift[];
  proposalState?: "pending" | "confirmed" | "discarded";
  resultSummary?: string;
}

function nextId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// Same conversion the rest of this app already uses for a naive local
// datetime string (RosterSection/EventModal's toIso): reading it via
// new Date(...) interprets it in the *browser's* local timezone, then
// toISOString() gives the correct UTC instant to send -- done here, in the
// browser, rather than on the server, which would otherwise have no way to
// know which timezone "9am" was supposed to mean.
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function summarizeProposal(shifts: AssistantProposedShift[]): string {
  return shifts.map((s) => `${s.userName}: ${s.date} ${s.startTime}-${s.endTime}`).join("; ");
}

export default function AssistantSection() {
  const { t } = useTranslation();
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getBillingStatus()
      .then((status) => {
        setEntitled(status.aiAssistantStatus === "active" || status.aiAssistantStatus === "past_due");
      })
      .catch(() => setEntitled(false));
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  async function handleSubscribe() {
    setError(null);
    setCheckingOut(true);
    try {
      const { redirectUrl } = await api.createAddonCheckout();
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assistant.checkoutFailed"));
      setCheckingOut(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;

    const history: AssistantChatTurn[] = turns.map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((prev) => [...prev, { id: nextId(), role: "user", content: message }]);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const result = await api.sendAssistantMessage(history, message);
      const content =
        result.proposedShifts.length > 0
          ? `${result.reply}\n\n(Proposed: ${summarizeProposal(result.proposedShifts)})`
          : result.reply;
      setTurns((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content,
          proposedShifts: result.proposedShifts.length > 0 ? result.proposedShifts : undefined,
          proposalState: result.proposedShifts.length > 0 ? "pending" : undefined,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assistant.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm(turnId: string) {
    const turn = turns.find((tn) => tn.id === turnId);
    if (!turn?.proposedShifts) return;
    setError(null);
    try {
      const { results } = await api.confirmAssistantShifts(
        turn.proposedShifts.map((s) => ({
          userId: s.userId,
          startsAt: toIso(s.date, s.startTime),
          endsAt: toIso(s.date, s.endTime),
          breakMinutes: s.breakMinutes,
        })),
      );
      const createdCount = results.filter((r) => r.status === "created").length;
      const failedCount = results.length - createdCount;
      const summary =
        failedCount === 0
          ? t("assistant.allCreated", { count: createdCount })
          : t("assistant.partiallyCreated", { created: createdCount, failed: failedCount });
      setTurns((prev) =>
        prev.map((tn) => (tn.id === turnId ? { ...tn, proposalState: "confirmed", resultSummary: summary } : tn)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assistant.confirmFailed"));
    }
  }

  function handleDiscard(turnId: string) {
    setTurns((prev) => prev.map((tn) => (tn.id === turnId ? { ...tn, proposalState: "discarded" } : tn)));
  }

  if (entitled === null) {
    return (
      <section className="panel">
        <h2>{t("assistant.title")}</h2>
        <p className="hint">{t("common.loading")}</p>
      </section>
    );
  }

  if (!entitled) {
    return (
      <section className="panel assistant-paywall">
        <h2 className="assistant-title">
          <Sparkles size={20} /> {t("assistant.title")}
        </h2>
        <p className="hint">{t("assistant.paywallDescription")}</p>
        <p className="assistant-paywall-price">{t("assistant.paywallPrice")}</p>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button type="button" onClick={handleSubscribe} disabled={checkingOut}>
            {checkingOut ? t("assistant.redirecting") : t("assistant.subscribe")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel chat-panel">
      <h2 className="assistant-title">
        <Sparkles size={20} /> {t("assistant.title")}
      </h2>
      {error && <div className="error">{error}</div>}

      <div className="chat-messages">
        {turns.length === 0 ? (
          <p className="hint">{t("assistant.empty")}</p>
        ) : (
          turns.map((turn) => (
            <div
              key={turn.id}
              className={`chat-bubble-row ${turn.role === "user" ? "chat-bubble-row-mine" : ""}`}
            >
              <div className="chat-bubble">
                <div className="chat-bubble-body">{turn.content}</div>
              </div>
              {turn.proposedShifts && (
                <div className="assistant-proposal">
                  <ul className="list">
                    {turn.proposedShifts.map((s, idx) => (
                      <li key={idx}>
                        <span>
                          <strong>{s.userName}</strong> — {s.date}, {s.startTime}-{s.endTime}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {turn.proposalState === "pending" && (
                    <div className="actions">
                      <button type="button" onClick={() => handleConfirm(turn.id)}>
                        <Check size={14} /> {t("assistant.confirm")}
                      </button>
                      <button type="button" onClick={() => handleDiscard(turn.id)}>
                        <X size={14} /> {t("assistant.discard")}
                      </button>
                    </div>
                  )}
                  {turn.proposalState === "confirmed" && (
                    <p className="success">{turn.resultSummary}</p>
                  )}
                  {turn.proposalState === "discarded" && <p className="hint">{t("assistant.discarded")}</p>}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      <form className="chat-composer" onSubmit={handleSend}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("assistant.placeholder")}
          maxLength={2000}
        />
        <button type="submit" disabled={sending || !draft.trim()}>
          {sending ? t("assistant.sending") : t("assistant.send")}
        </button>
      </form>
    </section>
  );
}
