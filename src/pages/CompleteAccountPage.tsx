import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import Avatar from "../components/Avatar";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function CompleteAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      await api.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("profile.uploadPhotoFailed"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user?.hasAvatar) {
      setError(t("completeAccount.photoRequired"));
      return;
    }
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

        <div className="profile-avatar-wrap complete-account-avatar">
          {user && (
            <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={88} />
          )}
          <button
            type="button"
            className="avatar-edit-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            title={t("profile.changePhoto")}
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            hidden
          />
        </div>
        <p className="hint">
          {user?.hasAvatar ? t("completeAccount.photoUploaded") : t("completeAccount.photoRequired")}
        </p>

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

        <button type="submit" disabled={submitting || !user?.hasAvatar}>
          {submitting ? t("completeAccount.saving") : t("completeAccount.save")}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
