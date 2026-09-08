import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError, setSelectedCompany } from "../api/client";
import type { Company } from "../api/types";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Per-company logos -- falls back to the plain Shiftline mark for any
// company that doesn't have its own icon set here yet.
const COMPANY_LOGO: Record<string, string> = {
  "super-sushi": "/logo-super-sushi-mark.png",
  zuiderzoet: "/logo-zuiderzoet.png",
};

const HOLD_MS = 1400;
const FADE_MS = 400;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function SelectCompanyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [welcoming, setWelcoming] = useState<Company | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    api
      .listCompanies()
      .then(setCompanies)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("auth.loadCompaniesFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function proceed(company: Company) {
    setSelectedCompany({ id: company.id, name: company.name });
    const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/login";
    navigate(returnTo);
  }

  function choose(company: Company) {
    if (prefersReducedMotion()) {
      proceed(company);
      return;
    }
    setWelcoming(company);
  }

  useEffect(() => {
    if (!welcoming) return;
    const holdTimer = setTimeout(() => setLeaving(true), HOLD_MS);
    return () => clearTimeout(holdTimer);
  }, [welcoming]);

  useEffect(() => {
    if (!leaving || !welcoming) return;
    const fadeTimer = setTimeout(() => proceed(welcoming), FADE_MS);
    return () => clearTimeout(fadeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  if (welcoming) {
    return (
      <div className={`company-welcome${leaving ? " leaving" : ""}`}>
        <img
          className="company-welcome-logo"
          src={COMPANY_LOGO[welcoming.slug] ?? "/icon-192.png"}
          alt=""
        />
        <div className="company-welcome-text">
          {t("auth.welcomeToCompany", { name: welcoming.name })}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <div className="company-select-page">
        <h1>{t("auth.selectCompanyTitle")}</h1>
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
                <img
                  className="company-select-logo"
                  src={COMPANY_LOGO[c.slug] ?? "/icon-192.png"}
                  alt=""
                />
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
