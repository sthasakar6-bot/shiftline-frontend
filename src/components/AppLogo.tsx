import { useAuth } from "../auth/AuthContext";

// Companies with their own wordmark image -- shown instead of the plain
// cursive business-name text so the header matches their real branding.
const COMPANY_WORDMARK: Record<string, string> = {
  zuiderzoet: "/logo-zuiderzoet-wordmark.png",
};

export default function AppLogo() {
  const { user } = useAuth();
  const wordmark = user?.companySlug ? COMPANY_WORDMARK[user.companySlug] : undefined;
  return (
    <div className="app-logo">
      <img className="app-logo-icon" src="/icon-192.png" alt="Shiftline" />
      <span className="app-logo-text">Shiftline</span>
      {wordmark ? (
        <img className="app-logo-business-mark" src={wordmark} alt={user!.companyName} />
      ) : (
        user?.companyName && <span className="app-logo-business">{user.companyName}</span>
      )}
    </div>
  );
}
