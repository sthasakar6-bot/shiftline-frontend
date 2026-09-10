import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import OnboardingPrompt from "./OnboardingPrompt";
import type { ReactNode } from "react";

export default function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "manager" | "bookkeeper";
}) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }
  if (!user) {
    return <Navigate to="/select-company" replace />;
  }
  // A manager-created account must set its own password and fill in contact
  // details before doing anything else -- force this before any other page.
  if (user.needsOnboarding && location.pathname !== "/complete-account") {
    return <Navigate to="/complete-account" replace />;
  }
  // A bookkeeper gets a completely separate, restricted UI -- never the
  // normal employee dashboard or admin panel. Exempt /complete-account too,
  // or this fights the needsOnboarding redirect above into a loop while a
  // bookkeeper is still finishing that mandatory step.
  if (
    user.role === "bookkeeper" &&
    location.pathname !== "/bookkeeper" &&
    location.pathname !== "/complete-account"
  ) {
    return <Navigate to="/bookkeeper" replace />;
  }
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      {/* Don't compete with the mandatory account-setup form -- the "add to
          home screen" / notifications pitch can wait until after it. */}
      {!user.needsOnboarding && <OnboardingPrompt />}
      {children}
    </>
  );
}
