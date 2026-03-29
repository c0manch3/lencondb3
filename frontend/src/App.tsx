import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthState, useAuthDispatch } from './store/AuthContext';
import type { UserRole } from './store/AuthContext';
import { authService } from './services/auth.service';
import MainLayout from './components/layout/MainLayout';

// Lazy-loaded page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const WorkloadPage = lazy(() => import('./pages/WorkloadPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SmtpSettingsPage = lazy(() => import('./pages/SmtpSettingsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Full-page loading spinner shown while lazy chunks load. */
function LoadingSpinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-600" />
    </div>
  );
}

/** Resets scroll position to top on every route change. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Protected route wrapper - just checks authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthState();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login with the current path as redirect parameter
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  return <>{children}</>;
}

// Role-based route wrapper
function RoleRoute({
  children,
  allowedRoles
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const { user } = useAuthState();

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to projects (dashboard) if user doesn't have permission
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
}

function App() {
  const dispatch = useAuthDispatch();
  const { user } = useAuthState();
  const [isInitializing, setIsInitializing] = useState(true);

  // Fetch user data on app load if we have a token but no user data
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token && !user) {
        try {
          const userData = await authService.checkToken();
          dispatch({ type: 'SET_CREDENTIALS', payload: { user: userData, accessToken: token } });
        } catch {
          // Token is invalid, clear it
          dispatch({ type: 'LOGOUT' });
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, [dispatch, user]);

  // Show loading while initializing auth
  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return (
    <>
    <ScrollToTop />
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />

          {/* Admin/Manager only routes */}
          <Route
            path="employees"
            element={
              <RoleRoute allowedRoles={['Admin', 'Manager']}>
                <EmployeesPage />
              </RoleRoute>
            }
          />
          <Route
            path="companies"
            element={
              <RoleRoute allowedRoles={['Admin', 'Manager']}>
                <CompaniesPage />
              </RoleRoute>
            }
          />

          <Route path="workload" element={<WorkloadPage />} />

          {/* Analytics - Manager, Admin, Trial */}
          <Route
            path="analytics"
            element={
              <RoleRoute allowedRoles={['Admin', 'Manager', 'Trial']}>
                <AnalyticsPage />
              </RoleRoute>
            }
          />

          {/* Expenses - Admin only */}
          <Route
            path="expenses"
            element={
              <RoleRoute allowedRoles={['Admin']}>
                <ExpensesPage />
              </RoleRoute>
            }
          />

          {/* SMTP Settings - Admin only */}
          <Route
            path="smtp-settings"
            element={
              <RoleRoute allowedRoles={['Admin']}>
                <SmtpSettingsPage />
              </RoleRoute>
            }
          />

          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </>
  );
}

export default App;
