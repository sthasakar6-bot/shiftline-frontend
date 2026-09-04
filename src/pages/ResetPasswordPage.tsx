import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .getPasswordResetToken(token)
      .then((res) => {
        setEmail(res.email);
        setTokenValid(true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t("auth.resetLinkTokenInvalid"));
      })
      .finally(() => setChecking(false));
  }, [token, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.completePasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.resetFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="loading">{t("auth.checkingResetLink")}</div>;
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-lang-switcher">
          <LanguageSwitcher />
        </div>
        <AuthBrand />
        <div className="auth-form">
          <h1>{t("auth.passwordUpdated")}</h1>
          <p className="hint">{t("auth.passwordUpdatedHint")}</p>
          <button onClick={() => navigate("/login")}>{t("auth.goToLogin")}</button>
        </div>
        <AuthFooter />
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="auth-page">
        <div className="auth-lang-switcher">
          <LanguageSwitcher />
        </div>
        <AuthBrand />
        <form className="auth-form">
          <h1>{t("auth.resetLinkInvalid")}</h1>
          <p className="hint">{t("auth.resetLinkInvalidHint")}</p>
          {error && <div className="error">{error}</div>}
          <p>
            <Link to="/login">{t("auth.backToLogin")}</Link>
          </p>
        </form>
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
        <h1>{t("auth.setNewPassword")}</h1>
        {error && <div className="error">{error}</div>}
        <label>
          {t("auth.email")}
          <input type="email" value={email} readOnly />
        </label>
        <label>
          {t("auth.newPassword")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? t("auth.saving") : t("auth.setNewPasswordBtn")}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
