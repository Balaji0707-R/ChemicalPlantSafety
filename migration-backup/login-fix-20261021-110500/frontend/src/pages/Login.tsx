import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError("Enter a valid email and password.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="CHEM-SAFE introduction">
        <div className="login-hero-grid" aria-hidden="true" />
        <div className="login-plant-visual" aria-hidden="true">
          <span className="login-tower login-tower-one" />
          <span className="login-tower login-tower-two" />
          <span className="login-pipe login-pipe-one" />
          <span className="login-pipe login-pipe-two" />
          <span className="login-tank" />
        </div>
        <div className="login-hero-content">
          <div className="login-brand">
            <span className="login-brand-mark"><ShieldCheck size={22} strokeWidth={2.2} /></span>
            <span>CHEM-SAFE</span>
          </div>
          <div className="login-hero-copy">
            <span className="login-kicker">INDUSTRIAL SAFETY MANAGEMENT</span>
            <h1>Safety starts with awareness.</h1>
            <p>
              A unified workspace for chemical inventory, plant inspections,
              incident response, and compliance.
            </p>
          </div>
          <div className="login-hero-status">
            <FlaskConical size={18} />
            <span>Operational visibility, built for safer plants.</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-icon" aria-hidden="true"><ShieldCheck size={21} /></div>
          <span className="login-kicker login-kicker-dark">SECURE WORKSPACE</span>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to your safety management workspace.</p>
          <div className="login-form-fields">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? <><span className="login-spinner" aria-hidden="true" />Signing in...</> : "Sign in"}
          </button>
          <p className="login-footer">CHEM-SAFE <span aria-hidden="true">·</span> Industrial Safety Management</p>
        </form>
      </section>
    </main>
  );
}

export default Login;
