import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { MARKETING_URL } from "../config";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";
import CompanyDetailsFields, {
  EMPTY_COMPANY_DETAILS,
  resolveBillingAddress,
  type CompanyDetailsState,
} from "../components/CompanyDetailsFields";

export default function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsState>(EMPTY_COMPANY_DETAILS);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!termsAccepted) {
      setError(t("signup.termsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const user = await signup({
        companyName,
        firstName,
        lastName,
        email,
        password,
        logo,
        kvkNumber: companyDetails.kvkNumber,
        vatNumber: companyDetails.vatNumber,
        businessType: companyDetails.businessType,
        industry: companyDetails.industry,
        estimatedEmployeeCount: Number(companyDetails.estimatedEmployeeCount),
        companyEmail: companyDetails.companyEmail,
        companyPhone: companyDetails.companyPhone,
        phone,
        addressStreet: companyDetails.addressStreet,
        addressNumber: companyDetails.addressNumber,
        addressPostcode: companyDetails.addressPostcode,
        addressCity: companyDetails.addressCity,
        countryOfRegistration: companyDetails.countryOfRegistration,
        billingAddress: resolveBillingAddress(companyDetails),
        contactPersonRole: role,
        termsAccepted,
      });
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

        <CompanyDetailsFields values={companyDetails} onChange={setCompanyDetails} />

        <h2 className="auth-section-title">{t("signup.yourDetailsTitle")}</h2>
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
        <div className="auth-form-row">
          <label className="field">
            <span className="field-label">{t("signup.phone")}</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">{t("signup.role")}</span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t("signup.rolePlaceholder")}
              required
            />
          </label>
        </div>
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

        <label className="auth-checkbox-row">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            I agree to the{" "}
            <a href={`${MARKETING_URL}/terms`} target="_blank" rel="noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={`${MARKETING_URL}/privacy`} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          </span>
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
