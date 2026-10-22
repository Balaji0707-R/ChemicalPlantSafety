import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { canAccessPage, type FrontendPage } from "../auth/permissions";

export const RoleGuard = ({
  page,
  children,
}: {
  page: FrontendPage;
  children: ReactNode;
}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessPage(user.roleName, page)) return <Navigate to="/" replace />;
  return children;
};
