import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function CompleteAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (user && !user.needsOnboarding) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("completeAccount.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await api.completeOnboarding({
        password,
        phone: phone || undefined,
        address: address || undefined,
      });
      await refreshUser();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("completeAccount.saveFailed"));
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
        <h1>{t("completeAccount.title")}</h1>
        <p className="hint">{t("completeAccount.hint")}</p>
        {error && <div className="error">{error}</div>}

        <label>
          {t("completeAccount.newPassword")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          {t("completeAccount.confirmPassword")}
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
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

        <button type="submit" disabled={submitting}>
          {submitting ? t("completeAccount.saving") : t("completeAccount.save")}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
