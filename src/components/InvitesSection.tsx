import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Invite } from "../api/types";

function inviteLinkFor(token: string) {
  return `${window.location.origin}/register?token=${token}`;
}

export default function InvitesSection() {
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
      setError(err instanceof ApiError ? err.message : "Failed to send invite");
    }
  }

  return (
    <section className="panel">
      <h2>Invite an employee</h2>
      <form className="inline-form" onSubmit={handleSendInvite}>
        <input
          type="email"
          placeholder="Employee's email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
        />
        <button type="submit">Create invite</button>
      </form>
      {error && <div className="error">{error}</div>}
      {lastInviteToken && (
        <div className="invite-link-callout">
          <span className="field-label">Invite link — copy and send it to them</span>
          <div className="inline-form">
            <input value={inviteLinkFor(lastInviteToken)} readOnly />
            <button type="button" onClick={() => handleCopyLink(lastInviteToken)}>
              {copiedToken === lastInviteToken ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      <ul className="list">
        {invites.map((i) => (
          <li key={i.id}>
            <span>
              {i.email} <span className={`status-badge ${i.status}`}>{i.status}</span>
            </span>
            {i.status === "pending" && (
              <span className="actions">
                <button onClick={() => handleCopyLink(i.token)}>
                  {copiedToken === i.token ? "Copied!" : "Copy link"}
                </button>
              </span>
            )}
          </li>
        ))}
        {invites.length === 0 && <li className="empty">No invites sent yet.</li>}
      </ul>
    </section>
  );
}
