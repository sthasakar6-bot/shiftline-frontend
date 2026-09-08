import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError, setSelectedCompany } from "../api/client";
import type { Company } from "../api/types";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function SelectCompanyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listCompanies()
      .then(setCompanies)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("auth.loadCompaniesFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(company: Company) {
    setSelectedCompany({ id: company.id, name: company.name });
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/login";
    navigate(returnTo);
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <div className="company-select-page">
        <h1>{t("auth.selectCompanyTitle")}</h1>
        <p className="hint">{t("auth.selectCompanyHint")}</p>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p className="hint">{t("auth.loadingCompanies")}</p>
        ) : companies.length === 0 ? (
          <p className="hint">{t("auth.noCompanies")}</p>
        ) : (
          <div className="company-select-grid">
            {companies.map((c) => (
              <button
                type="button"
                key={c.id}
                className="company-select-card"
                onClick={() => choose(c)}
              >
                <img className="company-select-logo" src="/icon-192.png" alt="" />
                <span className="company-select-name">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <AuthFooter />
    </div>
  );
}
