import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireRole({
  children,
  roles,
}: {
  children: ReactNode;
  roles: Array<"ADMIN" | "STAFF" | "CUSTOMER">;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const ok = user.roles.some((r) => roles.includes(r));
  if (!ok) return <Navigate to="/" replace />;

  return <>{children}</>;
}
