import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"employee" | "administration">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (mode === "administration" && user.role !== "manager") {
        logout();
        setError("This account doesn't have administrator access.");
        return;
      }
      navigate(mode === "administration" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Log in</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "employee" ? "active" : ""}
            onClick={() => setMode("employee")}
          >
            Employee / Team Member
          </button>
          <button
            type="button"
            className={mode === "administration" ? "active" : ""}
            onClick={() => setMode("administration")}
          >
            Administration
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting
            ? "Logging in..."
            : mode === "administration"
              ? "Log in to Administration"
              : "Log in"}
        </button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
