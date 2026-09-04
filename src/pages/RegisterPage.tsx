import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheckingInvite(false);
      return;
    }
    api
      .getInviteByToken(token)
      .then((res) => {
        setEmail(res.email);
        setInviteValid(true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t("auth.inviteInvalid"));
      })
      .finally(() => setCheckingInvite(false));
  }, [token, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        token,
        phone: phone || undefined,
        address: address || undefined,
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.registrationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingInvite) {
    return <div className="loading">{t("auth.checkingInvite")}</div>;
  }

  if (!token || !inviteValid) {
    return (
      <div className="auth-page">
        <div className="auth-lang-switcher">
          <LanguageSwitcher />
        </div>
        <AuthBrand />
        <form className="auth-form">
          <h1>{t("auth.inviteRequired")}</h1>
          <p className="hint">{t("auth.inviteRequiredHint")}</p>
          {error && <div className="error">{error}</div>}
          <p>
            {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
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
      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h1>{t("auth.createYourAccount")}</h1>
        <p className="hint">{t("auth.createAccountHint")}</p>
        {error && <div className="error">{error}</div>}

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
          <input type="email" value={email} readOnly />
        </label>

        <div className="auth-form-row">
          <label className="field">
            <span className="field-label">{t("auth.phoneOptional")}</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>

        <label>
          {t("auth.addressOptional")}
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? t("auth.creatingAccount") : t("auth.createAccount")}
        </button>
        <p>
          {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
        </p>
      </form>
      <AuthFooter />
    </div>
  );
}
