import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, RefreshCw, Laptop } from "lucide-react";
import { api, ApiError, API_URL } from "../api/client";
import type { BackupTokenInfo } from "../api/types";
import { getDateLocale } from "../i18n";
import ConfirmDialog from "./ConfirmDialog";

function buildScript(url: string): string {
  return [
    `$Url = "${url}"`,
    `$OutDir = "$env:USERPROFILE\\ShiftlineBackups"`,
    `if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }`,
    `$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"`,
    `Invoke-WebRequest -Uri $Url -OutFile "$OutDir\\backup-$Timestamp.csv"`,
  ].join("\n");
}

export default function BackupSection() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<BackupTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "script" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  useEffect(() => {
    api
      .getBackupToken()
      .then(setInfo)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("backup.loadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      const created = await api.createBackupToken();
      setInfo(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("backup.generateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setConfirmRevoke(false);
    setError(null);
    setBusy(true);
    try {
      await api.deleteBackupToken();
      setInfo(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("backup.revokeFailed"));
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(kind: "url" | "script", text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    });
  }

  if (loading) return null;

  const backupUrl = info ? `${API_URL}/api/backup?token=${info.token}` : "";
  const script = info ? buildScript(backupUrl) : "";

  return (
    <div className="backup-subsection">
      <div className="panel-subtitle">
        <span className="panel-title-icon">
          <Laptop size={15} />
        </span>
        <h3>{t("backup.title")}</h3>
      </div>
      {error && <div className="error">{error}</div>}

      {!info ? (
        <button onClick={handleGenerate} disabled={busy}>
          {t("backup.generate")}
        </button>
      ) : (
        <>
          <p className="hint">
            {t("backup.created", {
              date: new Date(info.createdAt).toLocaleString(getDateLocale()),
            })}
            {" · "}
            {info.lastUsedAt
              ? t("backup.lastUsed", {
                  date: new Date(info.lastUsedAt).toLocaleString(getDateLocale()),
                })
              : t("backup.neverUsed")}
          </p>

          <div className="invite-link-callout">
            <span className="field-label">{t("backup.urlLabel")}</span>
            <div className="inline-form">
              <input value={backupUrl} readOnly />
              <button type="button" onClick={() => handleCopy("url", backupUrl)}>
                {copied === "url" ? (
                  <Check size={14} />
                ) : (
                  <>
                    <Copy size={14} /> {t("backup.copyUrl")}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="invite-link-callout">
            <span className="field-label">{t("backup.scriptLabel")}</span>
            <pre className="backup-script">{script}</pre>
            <button type="button" onClick={() => handleCopy("script", script)}>
              {copied === "script" ? (
                <Check size={14} />
              ) : (
                <>
                  <Copy size={14} /> {t("backup.copyScript")}
                </>
              )}
            </button>
          </div>

          <div className="backup-setup">
            <h4>{t("backup.setupTitle")}</h4>
            <ol className="install-steps">
              <li>{t("backup.setupStep1")}</li>
              <li>{t("backup.setupStep2")}</li>
              <li>{t("backup.setupStep3")}</li>
              <li>{t("backup.setupStep4")}</li>
            </ol>
          </div>

          <div className="actions">
            <button onClick={handleGenerate} disabled={busy}>
              <RefreshCw size={14} /> {t("backup.regenerate")}
            </button>
            <button onClick={() => setConfirmRevoke(true)} disabled={busy}>
              {t("backup.revoke")}
            </button>
          </div>
        </>
      )}

      {confirmRevoke && (
        <ConfirmDialog
          title={t("backup.revokeQuestion")}
          message={t("backup.revokeConfirmMessage")}
          confirmLabel={t("backup.revoke")}
          danger
          onConfirm={handleRevoke}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}
    </div>
  );
}
