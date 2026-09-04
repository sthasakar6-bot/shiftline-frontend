import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.requestPasswordReset(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resetRequestFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-lang-switcher">
          <LanguageSwitcher />
        </div>
        <AuthBrand />
        <div className="auth-form">
          <h1>{t("auth.checkWithManager")}</h1>
          <p className="hint">{t("auth.checkWithManagerHint")}</p>
          <p>
            <Link to="/login">{t("auth.backToLogin")}</Link>
          </p>
        </div>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <AuthBrand />
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t("auth.forgotPageTitle")}</h1>
        <p className="hint">{t("auth.forgotHint")}</p>
        {error && <div className="error">{error}</div>}
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? t("auth.requesting") : t("auth.requestReset")}
        </button>
        <p>
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </form>
      <AuthFooter />
    </div>
  );
}
