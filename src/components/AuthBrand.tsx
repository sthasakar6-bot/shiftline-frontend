export default function AuthBrand() {
  return (
    <div className="auth-hero">
      <div className="auth-brand">
        <img className="auth-brand-icon" src="/icon-192.png" alt="Shiftline" />
        <span className="auth-brand-name">Shiftline</span>
      </div>
      <svg className="auth-wave" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,40 L0,18 C80,42 140,0 200,10 C260,20 320,42 400,14 L400,40 Z" fill="currentColor" />
      </svg>
    </div>
  );
}
