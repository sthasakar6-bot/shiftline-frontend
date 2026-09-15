import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, getSelectedCompany } from "../api/client";
import { PRICING_URL, WHATSAPP_URL } from "../config";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

// Matched against the backend's trial-expiry message (identity/service.ts
// login()) -- that endpoint has no structured error code today, only a
// plain-English message, same as every other backend error this app
// surfaces via ApiError.message.
function isTrialExpiredError(message: string): boolean {
  return message.toLowerCase().includes("trial has ended");
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"employee" | "administration">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const company = getSelectedCompany();

  useEffect(() => {
    if (!company) {
      navigate("/select-company", { state: { returnTo: "/login" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTrialExpired(false);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (mode === "administration" && user.role !== "manager") {
        logout();
        setError(t("auth.notAdminAccount"));
        return;
      }
      navigate(mode === "administration" ? "/admin" : "/");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t("auth.loginFailed");
      setError(message);
      setTrialExpired(err instanceof ApiError && isTrialExpiredError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  if (!company) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <AuthBrand />
      <p className="auth-welcome">{t("auth.welcome")}</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>{t("auth.login")}</h1>
        <button
          type="button"
          className="auth-company-banner"
          onClick={() => navigate("/select-company")}
        >
          <ChevronLeft size={14} />
          {t("auth.loggingInTo", { name: company.name })}
        </button>
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "employee" ? "active" : ""}
            onClick={() => setMode("employee")}
          >
            {t("auth.employee")}
          </button>
          <button
            type="button"
            className={mode === "administration" ? "active" : ""}
            onClick={() => setMode("administration")}
          >
            {t("auth.administration")}
          </button>
        </div>
        {error && (
          <div className="error">
            {error}
            {trialExpired && (
              <div className="trial-expired-actions">
                <a href={PRICING_URL} target="_blank" rel="noreferrer">
                  {t("auth.seePlans")}
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  <MessageCircle size={14} />
                  {t("auth.contactUs")}
                </a>
              </div>
            )}
          </div>
        )}
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting
            ? t("auth.loggingIn")
            : mode === "administration"
              ? t("auth.logInToAdmin")
              : t("auth.login")}
        </button>
        <p>
          <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
        </p>
      </form>
      <AuthFooter />
    </div>
  );
}
