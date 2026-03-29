import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthState, useAuthDispatch } from '@/shared/auth/AuthContext';
import { api } from '@/shared/api/client';
import ProtectedRoute from '@/shared/auth/ProtectedRoute';
import RoleRoute from '@/shared/auth/RoleRoute';
import Layout from '@/shared/components/Layout';
import type { User } from '@/shared/types';

// ─── Lazy page imports ───────────────────────────────────────────────────────

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const AcceptInvitePage = lazy(() => import('@/features/auth/AcceptInvitePage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));

const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/features/projects/ProjectDetailPage'));

const EmployeesPage = lazy(() => import('@/features/employees/EmployeesPage'));
const CompaniesPage = lazy(() => import('@/features/companies/CompaniesPage'));
const WorkloadPage = lazy(() => import('@/features/workload/WorkloadPage'));
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const SmtpSettingsPage = lazy(() => import('@/features/settings/SmtpSettingsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/features/not-found/NotFoundPage'));

// ─── Scroll restoration ──────────────────────────────────────────────────────

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ─── Loading spinner ─────────────────────────────────────────────────────────

function PageSpinner() {
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

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { accessToken, user } = useAuthState();
  const dispatch = useAuthDispatch();

  // Hydrate auth state on mount when a persisted token exists but no user
  useEffect(() => {
    if (!accessToken || user) {
      if (accessToken && user) return; // already hydrated
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      try {
        const { data } = await api.post<User>('/auth/check');
        if (!cancelled) {
          dispatch({
            type: 'SET_CREDENTIALS',
            payload: { user: data, accessToken: accessToken! },
          });
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'LOGOUT' });
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Default redirect */}
              <Route index element={<Navigate to="/projects" replace />} />

              {/* Accessible to all authenticated users */}
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/workload" element={<WorkloadPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Admin + Manager */}
              <Route element={<RoleRoute allowedRoles={['Admin', 'Manager']} />}>
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
              </Route>

              {/* Admin + Manager + Trial */}
              <Route element={<RoleRoute allowedRoles={['Admin', 'Manager', 'Trial']} />}>
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<RoleRoute allowedRoles={['Admin']} />}>
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/smtp-settings" element={<SmtpSettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
