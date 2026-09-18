import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getIctAdminToken } from "./client";

export default function IctAdminProtectedRoute({ children }: { children: ReactNode }) {
  if (!getIctAdminToken()) {
    return <Navigate to="/ict-admin/login" replace />;
  }
  return <>{children}</>;
}
