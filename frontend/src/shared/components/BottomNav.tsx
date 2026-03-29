import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/shared/auth/AuthContext';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import { useOverdueBadge } from '@/shared/hooks/useOverdueBadge';
import type { UserRole } from '@/shared/types';

// ─── Navigation config ──────────────────────────────────────────────────────

interface NavItem {
  key: string;
  path: string;
  labelKey: string;
  /** Short label key for bottom nav (fits small space). */
  shortLabelKey?: string;
  icon: (className?: string) => ReactNode;
  /** Roles that can see this item. Empty = all roles. */
  roles: UserRole[];
}

// --- SVG Icon factories (accept className for sizing) ---

const folderIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
  </svg>
);

const usersIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const buildingIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const calendarIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const barChartIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const currencyIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const mailIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const profileIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

const moreIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  </svg>
);

const logoutIcon = (cls = 'w-5 h-5') => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

// All nav items (shared config)
const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'projects', path: '/projects', labelKey: 'navigation.projects', icon: folderIcon, roles: [] },
  { key: 'employees', path: '/employees', labelKey: 'navigation.employees', icon: usersIcon, roles: ['Admin', 'Manager'] },
  { key: 'companies', path: '/companies', labelKey: 'navigation.companies', icon: buildingIcon, roles: ['Admin', 'Manager'] },
  { key: 'workload', path: '/workload', labelKey: 'navigation.workload', shortLabelKey: 'navigation.workloadShort', icon: calendarIcon, roles: [] },
  { key: 'analytics', path: '/analytics', labelKey: 'navigation.analytics', shortLabelKey: 'navigation.analyticsShort', icon: barChartIcon, roles: ['Admin', 'Manager', 'Trial'] },
  { key: 'expenses', path: '/expenses', labelKey: 'navigation.expenses', icon: currencyIcon, roles: ['Admin'] },
  { key: 'smtpSettings', path: '/smtp-settings', labelKey: 'navigation.smtpSettings', icon: mailIcon, roles: ['Admin'] },
];

// Keys that appear directly in bottom nav (max 5 including "more")
const PRIMARY_BOTTOM_KEYS = ['projects', 'workload', 'analytics'];

function isNavVisible(item: NavItem, role?: UserRole): boolean {
  if (item.roles.length === 0) return true;
  return role ? item.roles.includes(role) : false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BottomNav() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { attemptNavigation } = useUnsavedChanges();

  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const role = user?.role;
  const { data: overdueSummary } = useOverdueBadge(role);

  // Close "more" menu on outside click
  useEffect(() => {
    if (!moreOpen) return;

    function handleClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  // Close on escape
  useEffect(() => {
    if (!moreOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [moreOpen]);

  // Close "more" on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const navigateTo = useCallback(
    (path: string) => {
      const proceeded = attemptNavigation(path);
      if (proceeded) {
        setMoreOpen(false);
      }
    },
    [attemptNavigation],
  );

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  const visibleItems = ALL_NAV_ITEMS.filter((item) => isNavVisible(item, role));

  // Split into primary (shown directly) and overflow (shown in "more" menu)
  const primaryItems = visibleItems.filter((item) =>
    PRIMARY_BOTTOM_KEYS.includes(item.key),
  );
  const overflowItems = visibleItems.filter(
    (item) => !PRIMARY_BOTTOM_KEYS.includes(item.key),
  );

  // Check if any overflow item is active (to highlight the "more" button)
  const isOverflowActive = overflowItems.some((item) => isActive(item.path));
  const isProfileActive = isActive('/profile');
  const hasOverflow = overflowItems.length > 0;

  return (
    <div className="md:hidden" ref={moreMenuRef}>
      {/* ── Slide-up "More" menu overlay ───────────────────────────── */}
      {moreOpen && (
        <>
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-brown-950/50 z-30"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-up panel */}
          <div
            className="fixed bottom-16 left-0 right-0 bg-brown-900 border-t border-brown-800 rounded-t-2xl z-40 pb-2 pt-3"
            style={{ animation: 'slideUp 0.25s ease-out forwards' }}
            role="menu"
            aria-label={t('navigation.more')}
          >
            {/* Handle indicator */}
            <div className="flex justify-center mb-2">
              <div className="w-10 h-1 rounded-full bg-brown-700" />
            </div>

            <div className="flex flex-col px-4 gap-0.5">
              {overflowItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigateTo(item.path)}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded text-sm font-medium
                    transition-colors duration-200 cursor-pointer min-h-touch
                    ${isActive(item.path)
                      ? 'text-accent-300 bg-brown-800'
                      : 'text-cream-200 hover:text-cream-50 hover:bg-brown-800'}
                  `}
                  role="menuitem"
                >
                  {item.icon('w-5 h-5')}
                  <span>{t(item.labelKey)}</span>

                  {/* Overdue badge on Expenses */}
                  {item.key === 'expenses' &&
                    overdueSummary &&
                    overdueSummary.count > 0 && (
                      <span
                        className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-semibold px-1.5"
                        role="status"
                      >
                        {overdueSummary.count}
                      </span>
                    )}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-brown-800 my-1" />

              {/* Logout in more menu */}
              <button
                onClick={() => {
                  logout();
                  setMoreOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded text-sm text-red-400 hover:text-red-300 hover:bg-brown-800 transition-colors duration-200 cursor-pointer min-h-touch"
                role="menuitem"
              >
                {logoutIcon('w-5 h-5')}
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Bottom bar ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-brown-900 border-t border-brown-800 z-40 flex items-center justify-around safe-area-pb"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {primaryItems.map((item) => (
          <button
            key={item.key}
            onClick={() => navigateTo(item.path)}
            className={`
              flex flex-col items-center justify-center gap-0.5 flex-1 h-full
              transition-colors duration-200 cursor-pointer min-w-touch
              ${isActive(item.path) ? 'text-accent-300' : 'text-cream-400'}
            `}
            aria-current={isActive(item.path) ? 'page' : undefined}
            aria-label={t(item.labelKey)}
          >
            {item.icon('w-5 h-5')}
            <span className="text-[10px] font-medium leading-tight">
              {t(item.shortLabelKey ?? item.labelKey)}
            </span>
          </button>
        ))}

        {/* Profile tab */}
        <button
          onClick={() => navigateTo('/profile')}
          className={`
            flex flex-col items-center justify-center gap-0.5 flex-1 h-full
            transition-colors duration-200 cursor-pointer min-w-touch
            ${isProfileActive ? 'text-accent-300' : 'text-cream-400'}
          `}
          aria-current={isProfileActive ? 'page' : undefined}
          aria-label={t('navigation.profile')}
        >
          {profileIcon('w-5 h-5')}
          <span className="text-[10px] font-medium leading-tight">
            {t('navigation.profile')}
          </span>
        </button>

        {/* "More" tab */}
        {hasOverflow && (
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`
              relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full
              transition-colors duration-200 cursor-pointer min-w-touch
              ${moreOpen || isOverflowActive ? 'text-accent-300' : 'text-cream-400'}
            `}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            aria-label={t('navigation.more')}
          >
            {moreIcon('w-5 h-5')}
            <span className="text-[10px] font-medium leading-tight">
              {t('navigation.more')}
            </span>

            {/* Badge indicator if expenses overflow has overdue */}
            {overdueSummary &&
              overdueSummary.count > 0 &&
              !moreOpen && (
                <span
                  className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-red-600"
                  role="status"
                  aria-label={`${overdueSummary.count} overdue`}
                />
              )}
          </button>
        )}
      </nav>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
