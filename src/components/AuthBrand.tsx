export default function AuthBrand() {
  return (
    <div className="auth-illustration" aria-hidden="true">
      <div className="auth-illustration-art">
        <span className="auth-orb auth-orb-a" />
        <span className="auth-orb auth-orb-b" />
        <span className="auth-orb auth-orb-c" />
        <span className="auth-spark auth-spark-a" />
        <span className="auth-spark auth-spark-b" />
        <span className="auth-spark auth-spark-c" />
      </div>
      <div className="auth-illustration-brand">
        <img className="auth-brand-icon" src="/icon-192.png" alt="" />
        <span className="auth-brand-name">Shiftline</span>
      </div>
      <p className="auth-illustration-tagline">
        Keep every
        <br />
        shift in line.
      </p>
    </div>
  );
}
