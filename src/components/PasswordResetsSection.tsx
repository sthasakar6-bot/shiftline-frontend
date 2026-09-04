import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { PasswordResetRequest } from "../api/types";

function resetLinkFor(token: string) {
  return `${window.location.origin}/reset-password?token=${token}`;
}

export default function PasswordResetsSection() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function loadRequests() {
    api.listPasswordResetRequests().then(setRequests).catch(() => {});
  }

  useEffect(loadRequests, []);

  function handleCopyLink(token: string) {
    navigator.clipboard.writeText(resetLinkFor(token)).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000);
    });
  }

  if (requests.length === 0) return null;

  return (
    <section className="panel">
      <h2>{t("passwordResets.title")}</h2>
      <ul className="list">
        {requests.map((r) => (
          <li key={r.id}>
            <span>{r.employeeName}</span>
            <span className="actions">
              <button onClick={() => handleCopyLink(r.token)}>
                {copiedToken === r.token ? t("invites.copied") : t("passwordResets.copyResetLink")}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
