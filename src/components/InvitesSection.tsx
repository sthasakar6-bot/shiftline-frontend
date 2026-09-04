import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { Invite } from "../api/types";

function inviteLinkFor(token: string) {
  return `${window.location.origin}/register?token=${token}`;
}

export default function InvitesSection() {
  const { t } = useTranslation();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadInvites() {
    api.listInvites().then(setInvites).catch(() => {});
  }

  useEffect(loadInvites, []);

  function handleCopyLink(token: string) {
    navigator.clipboard.writeText(inviteLinkFor(token)).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
    });
  }

  async function handleSendInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLastInviteToken(null);
    try {
      const invite = await api.createInvite(inviteEmail);
      setInviteEmail("");
      setLastInviteToken(invite.token);
      loadInvites();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("invites.sendFailed"));
    }
  }

  return (
    <section className="panel">
      <h2>{t("invites.title")}</h2>
      <form className="inline-form" onSubmit={handleSendInvite}>
        <input
          type="email"
          placeholder={t("invites.emailPlaceholder")}
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
        <button type="submit">{t("invites.createInvite")}</button>
      </form>
      {error && <div className="error">{error}</div>}
      {lastInviteToken && (
        <div className="invite-link-callout">
          <span className="field-label">{t("invites.linkCallout")}</span>
          <div className="inline-form">
            <input value={inviteLinkFor(lastInviteToken)} readOnly />
            <button type="button" onClick={() => handleCopyLink(lastInviteToken)}>
              {copiedToken === lastInviteToken ? t("invites.copied") : t("invites.copyLink")}
            </button>
          </div>
        </div>
      )}
      <ul className="list">
        {invites.map((i) => (
          <li key={i.id}>
            <span>
              {i.email}{" "}
              <span className={`status-badge ${i.status}`}>
                {i.status === "accepted" ? t("invites.statusAccepted") : t("invites.statusPending")}
              </span>
            </span>
            {i.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCopyLink(i.token)}>
                  {copiedToken === i.token ? t("invites.copied") : t("invites.copyLink")}
                </button>
              </span>
            )}
          </li>
        ))}
        {invites.length === 0 && <li className="empty">{t("invites.noInvites")}</li>}
      </ul>
    </section>
  );
}
