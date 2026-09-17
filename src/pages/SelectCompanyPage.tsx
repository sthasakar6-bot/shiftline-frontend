import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { api, ApiError, setSelectedCompany } from "../api/client";
import type { Company } from "../api/types";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Per-company logos -- falls back to the plain Shiftline mark for any
// company that doesn't have its own icon set here yet.
const COMPANY_LOGO: Record<string, string> = {
  "super-sushi": "/logo-super-sushi-mark.png",
  zuiderzoet: "/logo-zuiderzoet.png",
  "sunrise-bakery": "/logo-sunrise-bakery.png",
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
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

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
      <AuthBrand />
      <div className="company-select-open">
        <h1>{t("auth.selectCompanyTitle")}</h1>

        <div className="company-search">
          <Search size={16} />
          <input
            type="search"
            placeholder={t("auth.searchCompany") as string}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <div className="error">{error}</div>}
        {loading ? (
          <p className="hint">{t("auth.loadingCompanies")}</p>
        ) : filtered.length === 0 ? (
          <p className="hint">{t("auth.noCompanies")}</p>
        ) : (
          <ul className="company-select-list">
            {filtered.map((c) => (
              <li key={c.id}>
                <button type="button" className="company-select-row" onClick={() => choose(c)}>
                  <img
                    className="company-select-logo"
                    src={COMPANY_LOGO[c.slug] ?? "/icon-192.png"}
                    alt=""
                  />
                  <span className="company-select-name">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <AuthFooter />
    </div>
  );
}
