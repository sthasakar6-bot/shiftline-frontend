import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import AuthBrand from "../components/AuthBrand";
import AuthFooter from "../components/AuthFooter";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        setError(err instanceof ApiError ? err.message : "This invite link is invalid");
      })
      .finally(() => setCheckingInvite(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password, token);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingInvite) {
    return <div className="loading">Checking invite...</div>;
  }

  if (!token || !inviteValid) {
    return (
      <div className="auth-page">
        <AuthBrand />
        <form className="auth-form">
          <h1>Invite required</h1>
          <p className="hint">
            Shiftline is invite-only. Ask your manager to send you an invite link, then open it to
            create your account.
          </p>
          {error && <div className="error">{error}</div>}
          <p>
            Already have an account? <Link to="/login">Log in</Link>
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
        <h1>Create your account</h1>
        {error && <div className="error">{error}</div>}
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} readOnly />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
      <AuthFooter />
    </div>
  );
}
