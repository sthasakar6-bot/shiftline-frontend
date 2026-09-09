import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, getSelectedCompany } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"employee" | "administration">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      setError(err instanceof ApiError ? err.message : t("auth.loginFailed"));
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
        {error && <div className="error">{error}</div>}
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
