import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Download, History } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { BackupSnapshotMeta } from "../api/types";
import { getDateLocale } from "../i18n";
import { formatRelativeTime } from "../lib/formatDate";
import { SkeletonRows } from "./Skeleton";

export default function BackupHistorySection() {
  const { t } = useTranslation();
  const [snapshots, setSnapshots] = useState<BackupSnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    api
      .listBackupHistory()
      .then(setSnapshots)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("backup.autoLoadFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload(snapshot: BackupSnapshotMeta) {
    setError(null);
    setDownloadingId(snapshot.id);
    try {
      const blob = await api.getBackupHistoryCsv(snapshot.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shiftline-backup-${snapshot.createdAt.slice(0, 16).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("backup.autoDownloadFailed"));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="backup-subsection">
      <div className="panel-subtitle">
        <span className="panel-title-icon">
          <Cloud size={15} />
        </span>
        <h3>{t("backup.autoTitle")}</h3>
        <span className="panel-title-badge">{t("backup.recommended")}</span>
      </div>
      {error && <div className="error">{error}</div>}

      <ul className="list">
        {loading && <SkeletonRows count={3} avatar={false} />}
        {!loading &&
          snapshots.map((s) => (
            <li key={s.id}>
              <span className="backup-row">
                <span className="backup-row-icon">
                  <History size={14} />
                </span>
                <span className="backup-row-body">
                  <span className="backup-row-time">
                    {new Date(s.createdAt).toLocaleString(getDateLocale())}
                  </span>
                  <span className="backup-row-relative">{formatRelativeTime(s.createdAt)}</span>
                </span>
              </span>
              <span className="actions">
                <button onClick={() => handleDownload(s)} disabled={downloadingId === s.id}>
                  <Download size={14} /> {t("backup.autoDownload")}
                </button>
              </span>
            </li>
          ))}
        {!loading && snapshots.length === 0 && (
          <li className="empty">{t("backup.autoEmpty")}</li>
        )}
      </ul>
    </div>
  );
}
