import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function CompleteSignupPage() {
  const { t } = useTranslation();
  const { completeSignup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const plan = searchParams.get("plan") === "unlimited" ? "unlimited" : "starter";
  const interval = searchParams.get("interval") === "yearly" ? "yearly" : "monthly";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentNotConfirmed, setPaymentNotConfirmed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/purchase", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (!logo) return;
    const url = URL.createObjectURL(logo);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

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
    setPaymentNotConfirmed(false);
    try {
      const user = await completeSignup({ email, companyName, firstName, lastName, password, logo });
      navigate(user.role === "manager" ? "/admin" : "/");
    } catch (err) {
      // A real race, not just defensive: the webhook that confirms payment
      // can land a few seconds after Mollie's own redirect back here, so
      // the very first submit attempt genuinely can be too early. But it's
      // also the same error for someone who never paid at all (e.g. backed
      // out of Mollie's checkout) -- retrying alone can never help that
      // case, so goToPayment below gives them a real way forward.
      if (err instanceof ApiError && err.code === "PAYMENT_NOT_CONFIRMED") {
        setError(t("completeSignup.confirmingPayment"));
        setPaymentNotConfirmed(true);
      } else {
        setError(err instanceof ApiError ? err.message : t("signup.failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function goToPayment() {
    setRedirecting(true);
    setError(null);
    try {
      const { redirectUrl } = await api.startPurchase({ email, plan, interval });
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("purchase.failed"));
      setRedirecting(false);
    }
  }

  if (!email) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-lang-switcher">
        <LanguageSwitcher />
      </div>
      <AuthBrand />
      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h1>{t("completeSignup.title")}</h1>
        <p className="hint">{t("completeSignup.paidNote")}</p>
        {error && <div className="error">{error}</div>}
        {paymentNotConfirmed && (
          <button type="button" onClick={goToPayment} disabled={redirecting}>
            {redirecting ? t("purchase.redirecting") : t("completeSignup.goToPayment")}
          </button>
        )}

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
            {logoPreviewUrl ? <img src={logoPreviewUrl} alt="" /> : <Camera size={20} />}
          </div>
          <button
            type="button"
            className="avatar-edit-btn"
            onClick={() => fileInputRef.current?.click()}
            title={t("signup.uploadLogo")}
          >
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} hidden />
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
          <input type="email" value={email} disabled />
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
          {submitting ? t("signup.submitting") : t("completeSignup.submit")}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
