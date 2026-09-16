import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

// Companies with their own wordmark image -- shown instead of the plain
// cursive business-name text so the header matches their real branding.
const COMPANY_WORDMARK: Record<string, string> = {
  zuiderzoet: "/logo-zuiderzoet-wordmark.png",
};

function daysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function PlanBadge() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  if (user.companyPlan === "trial") {
    const label = user.companyTrialEndsAt
      ? t("plan.trialDaysLeft", { count: daysLeft(user.companyTrialEndsAt) })
      : t("plan.trial");
    return <span className="plan-badge plan-badge-trial">{label}</span>;
  }
  if (user.companyPlan === "starter" || user.companyPlan === "unlimited") {
    return (
      <span className="plan-badge plan-badge-paid">
        {t(user.companyPlan === "starter" ? "plan.starter" : "plan.unlimited")}
      </span>
    );
  }
  // Pre-billing-era companies backfilled with an unrestricted grandfather
  // plan -- not "trial" and not a real Starter/Unlimited tier, but still a
  // real paying account, so it gets a badge too instead of silently
  // showing nothing (which is what happened for Super Sushi/Zuiderzoet
  // before either was ever moved onto a real plan).
  if (user.companyPlan === "legacy") {
    return <span className="plan-badge plan-badge-paid">{t("plan.legacy")}</span>;
  }
  return null;
}

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
      <PlanBadge />
    </div>
  );
}
