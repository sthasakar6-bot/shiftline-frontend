import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

function daysLeft(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// Only the trial gets a badge -- it's the one state where a countdown is
// actually useful information ("act before this runs out"). A paid company
// (starter/unlimited/legacy) doesn't need a permanent label next to its own
// name on every screen.
function PlanBadge() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user || user.companyPlan !== "trial") return null;

  const label = user.companyTrialEndsAt
    ? t("plan.trialDaysLeft", { count: daysLeft(user.companyTrialEndsAt) })
    : t("plan.trial");
  return <span className="plan-badge plan-badge-trial">{label}</span>;
}

export default function AppLogo() {
  return (
    <div className="app-logo">
      <img className="app-logo-icon" src="/icon-192.png" alt="Shiftline" />
      <span className="app-logo-text">Shiftline</span>
      <PlanBadge />
    </div>
  );
}
