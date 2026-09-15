import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

const INTENDED_PLAN_KEY = "shiftline_intended_plan";

export default function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!logo) return;
    const url = URL.createObjectURL(logo);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  // Remembers what the visitor clicked on the marketing site's pricing page
  // (e.g. Starter vs. Unlimited) so the billing tab can pre-select it after
  // signup -- signup itself collects no payment, so this is purely a
  // same-session UI nicety, never sent to the backend.
  useEffect(() => {
    const plan = searchParams.get("intendedPlan");
    const interval = searchParams.get("interval");
    if (plan === "starter" || plan === "unlimited") {
      localStorage.setItem(
        INTENDED_PLAN_KEY,
        JSON.stringify({ plan, interval: interval === "yearly" ? "yearly" : "monthly" }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    setLogo(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logo) {
      setError(t("signup.logoRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signup.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const user = await signup({ companyName, firstName, lastName, email, password, logo });
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

        <div className="profile-avatar-wrap complete-account-avatar">
          <div className="signup-logo-preview" aria-hidden={!logoPreviewUrl}>
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="" />
            ) : (
              <Camera size={20} />
            )}
          </div>
          <button
            type="button"
            className="avatar-edit-btn"
            onClick={() => fileInputRef.current?.click()}
            title={t("signup.uploadLogo")}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            hidden
          />
        </div>
        <p className="hint">{logo ? t("signup.logoUploaded") : t("signup.logoRequired")}</p>

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

        <button type="submit" disabled={submitting || !logo}>
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
