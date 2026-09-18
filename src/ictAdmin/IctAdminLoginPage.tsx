import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ictAdminApi, setIctAdminToken, IctAdminApiError } from "./client";

export default function IctAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await ictAdminApi.login(email, password);
      setIctAdminToken(token);
      navigate("/ict-admin");
    } catch (err) {
      setError(err instanceof IctAdminApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ict-login-page">
      <form className="ict-login-form" onSubmit={handleSubmit}>
        <h1>ICT Admin</h1>
        <p className="ict-login-sub">Internal operations access only.</p>
        {error && <div className="ict-login-error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
