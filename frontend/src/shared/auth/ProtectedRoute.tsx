import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthState } from '@/shared/auth/AuthContext';

/**
 * Route guard that redirects unauthenticated users to /login.
 *
 * Preserves the original destination as a `redirect` query parameter so the
 * login page can navigate back after successful authentication.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthState();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: '#f9f0d9' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
          style={{ color: '#22150d' }}
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
  }

  return <Outlet />;
}
