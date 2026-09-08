import { BUSINESS_NAME } from "../lib/branding";

export default function AppLogo() {
  return (
    <div className="app-logo">
      <img className="app-logo-icon" src="/icon-192.png" alt="Shiftline" />
      <span className="app-logo-text">Shiftline</span>
      <span className="app-logo-business">{BUSINESS_NAME}</span>
    </div>
  );
}
