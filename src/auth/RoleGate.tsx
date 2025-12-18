import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useRole, Role } from './RoleProvider';

export function RoleGate({
  allow,
  children,
}: { allow: Role[]; children: ReactNode }) {
  const { role } = useRole();
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={`/${role}`} replace />;
  return <>{children}</>;
}
