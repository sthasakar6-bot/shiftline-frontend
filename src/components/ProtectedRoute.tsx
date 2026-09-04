import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import OnboardingPrompt from "./OnboardingPrompt";
import type { ReactNode } from "react";

export default function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: "manager";
}) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <OnboardingPrompt />
      {children}
    </>
  );
}
