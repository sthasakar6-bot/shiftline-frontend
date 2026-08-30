import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.requestPasswordReset(email);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to request a reset");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <AuthBrand />
        <div className="auth-form">
          <h1>Check with your manager</h1>
          <p className="hint">
            Your manager has been notified and can send you a link to set a new password.
          </p>
          <p>
            <Link to="/login">Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthBrand />
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Forgot password</h1>
        <p className="hint">
          Enter your account email. Your manager will be notified and can send you a link to set
          a new password.
        </p>
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Requesting..." : "Request reset"}
        </button>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
