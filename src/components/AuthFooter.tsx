import { useTranslation } from "react-i18next";

export default function AuthFooter() {
  const { t } = useTranslation();
  return <p className="auth-footer">{t("footer.rights", { year: new Date().getFullYear() })}</p>;
}
