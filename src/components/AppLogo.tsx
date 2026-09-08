import { useAuth } from "../auth/AuthContext";

export default function AppLogo() {
  const { user } = useAuth();
  return (
    <div className="app-logo">
      <img className="app-logo-icon" src="/icon-192.png" alt="Shiftline" />
      <span className="app-logo-text">Shiftline</span>
      {user?.companyName && <span className="app-logo-business">{user.companyName}</span>}
    </div>
  );
}
