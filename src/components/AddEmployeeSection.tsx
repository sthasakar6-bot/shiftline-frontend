import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(): string {
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join("");
}

export default function AddEmployeeSection() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await api.createEmployee({ firstName, lastName, email, password });
      setCreated({ name: user.name, email: user.email, password });
      setCopied(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("addEmployee.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyCredentials() {
    if (!created) return;
    const text = `${t("auth.email")}: ${created.email}\n${t("auth.password")}: ${created.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="panel">
      <h2>{t("addEmployee.title")}</h2>
      <p className="hint">{t("addEmployee.hint")}</p>
      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          placeholder={t("auth.firstName")}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          placeholder={t("auth.lastName")}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder={t("addEmployee.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <button type="button" onClick={() => setPassword(generatePassword())}>
          {t("addEmployee.generatePassword")}
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? t("addEmployee.creating") : t("addEmployee.createEmployee")}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {created && (
        <div className="credentials-callout">
          <span className="field-label">
            {t("addEmployee.credentialsCallout", { name: created.name })}
          </span>
          <p>
            {t("auth.email")}: <strong>{created.email}</strong>
            <br />
            {t("auth.password")}: <strong>{created.password}</strong>
          </p>
          <button type="button" onClick={handleCopyCredentials}>
            {copied ? t("common.copied") : t("addEmployee.copyCredentials")}
          </button>
        </div>
      )}
    </section>
  );
}
