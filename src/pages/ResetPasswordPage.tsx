import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .getPasswordResetToken(token)
      .then((res) => {
        setEmail(res.email);
        setTokenValid(true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "This reset link is invalid");
      })
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.completePasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="loading">Checking reset link...</div>;
  }

  if (done) {
    return (
      <div className="auth-page">
        <AuthBrand />
        <div className="auth-form">
          <h1>Password updated</h1>
          <p className="hint">You can now log in with your new password.</p>
          <button onClick={() => navigate("/login")}>Go to login</button>
        </div>
        <AuthFooter />
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="auth-page">
        <AuthBrand />
        <form className="auth-form">
          <h1>Reset link invalid</h1>
          <p className="hint">
            This link may have expired or already been used. Ask your manager to send a new one.
          </p>
          {error && <div className="error">{error}</div>}
          <p>
            <Link to="/login">Back to login</Link>
          </p>
        </form>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthBrand />
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Set a new password</h1>
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input type="email" value={email} readOnly />
        </label>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Set new password"}
        </button>
      </form>
      <AuthFooter />
    </div>
  );
}
