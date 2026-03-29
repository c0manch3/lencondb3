import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from '@/shared/auth/AuthContext';
import type { UserRole } from '@/shared/types';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

/**
 * Route guard that restricts access by user role.
 *
 * Must be nested inside a ProtectedRoute (i.e. the user is already
 * authenticated). If the user's role is not in `allowedRoles`, they are
 * redirected to /projects.
 */
export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user } = useAuthState();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/projects" replace />;
  }

  return <Outlet />;
}
