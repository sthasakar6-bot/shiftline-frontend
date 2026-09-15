import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("signup.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const user = await signup({ companyName, firstName, lastName, email, password });
      navigate(user.role === "manager" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("signup.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <AuthBrand />
      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h1>{t("signup.title")}</h1>
        <p className="hint">{t("signup.trialNote")}</p>
        {error && <div className="error">{error}</div>}

        <label>
          {t("signup.companyName")}
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            minLength={2}
          />
        </label>
        <div className="auth-form-row">
          <label className="field">
            <span className="field-label">{t("auth.firstName")}</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">{t("auth.lastName")}</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
        </div>
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t("signup.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          {t("signup.confirmPassword")}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? t("signup.submitting") : t("signup.submit")}
        </button>
        <p>
          {t("signup.alreadyHaveAccount")} <Link to="/select-company">{t("signup.logIn")}</Link>
        </p>
      </form>
      <AuthFooter />
    </div>
  );
}
