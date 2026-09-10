import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { PasswordResetRequest } from "../api/types";
import { generatePassword } from "../lib/generatePassword";

function resetLinkFor(token: string) {
  return `${window.location.origin}/reset-password?token=${token}`;
}

export default function PasswordResetsSection() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ employeeName: string; password: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

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

  async function handleSetPassword(r: PasswordResetRequest) {
    setError(null);
    setResolvingId(r.id);
    const password = generatePassword();
    try {
      await api.resolvePasswordResetRequest(r.id, password);
      setResolved({ employeeName: r.employeeName, password });
      setCopiedCredentials(false);
      loadRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("passwordResets.resolveFailed"));
    } finally {
      setResolvingId(null);
    }
  }

  function handleCopyCredentials() {
    if (!resolved) return;
    const text = `${t("auth.password")}: ${resolved.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2000);
    });
  }

  if (requests.length === 0 && !resolved) return null;

  return (
    <section className="panel">
      <h2>{t("passwordResets.title")}</h2>
      <ul className="list">
        {requests.map((r) => (
          <li key={r.id}>
            <span>{r.employeeName}</span>
            <span className="actions">
              <button onClick={() => handleCopyLink(r.token)}>
                {copiedToken === r.token ? t("common.copied") : t("passwordResets.copyResetLink")}
              </button>
              <button onClick={() => handleSetPassword(r)} disabled={resolvingId === r.id}>
                {resolvingId === r.id
                  ? t("passwordResets.settingPassword")
                  : t("passwordResets.setNewPassword")}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error && <div className="error">{error}</div>}
      {resolved && (
        <div className="credentials-callout">
          <span className="field-label">
            {t("passwordResets.resolvedCallout", { name: resolved.employeeName })}
          </span>
          <p>
            {t("auth.password")}: <strong>{resolved.password}</strong>
          </p>
          <button type="button" onClick={handleCopyCredentials}>
            {copiedCredentials ? t("common.copied") : t("passwordResets.copyPassword")}
          </button>
        </div>
      )}
    </section>
  );
}
