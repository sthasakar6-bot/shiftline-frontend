import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import BackupHistorySection from "./BackupHistorySection";
import BackupSection from "./BackupSection";

export default function BackupOverviewSection() {
  const { t } = useTranslation();

  return (
    <section className="panel">
      <div className="panel-title">
        <span className="panel-title-icon">
          <Shield size={17} />
        </span>
        <h2>{t("backup.overviewTitle")}</h2>
      </div>

      <BackupHistorySection />
      <BackupSection />
    </section>
  );
}
