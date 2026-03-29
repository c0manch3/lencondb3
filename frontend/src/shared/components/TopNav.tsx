import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  icon: ReactNode;
  /** Roles that can see this item. Empty = all roles. */
  roles: UserRole[];
}

const FolderIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

const BarChartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { key: 'projects', path: '/projects', labelKey: 'navigation.projects', icon: <FolderIcon />, roles: [] },
  { key: 'employees', path: '/employees', labelKey: 'navigation.employees', icon: <UsersIcon />, roles: ['Admin', 'Manager'] },
  { key: 'companies', path: '/companies', labelKey: 'navigation.companies', icon: <BuildingIcon />, roles: ['Admin', 'Manager'] },
  { key: 'workload', path: '/workload', labelKey: 'navigation.workload', icon: <CalendarIcon />, roles: [] },
  { key: 'analytics', path: '/analytics', labelKey: 'navigation.analytics', icon: <BarChartIcon />, roles: ['Admin', 'Manager', 'Trial'] },
  { key: 'expenses', path: '/expenses', labelKey: 'navigation.expenses', icon: <CurrencyIcon />, roles: ['Admin'] },
  { key: 'smtpSettings', path: '/smtp-settings', labelKey: 'navigation.smtpSettings', icon: <MailIcon />, roles: ['Admin'] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function isNavVisible(item: NavItem, role?: UserRole): boolean {
  if (item.roles.length === 0) return true;
  return role ? item.roles.includes(role) : false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TopNav() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { attemptNavigation } = useUnsavedChanges();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const role = user?.role;
  const { data: overdueSummary } = useOverdueBadge(role);

  // ─── Close on outside click ──────────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Escape key closes menus ─────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // ─── Lock body scroll when mobile menu is open ───────────────────────

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // ─── Navigation handler (unsaved changes aware) ──────────────────────

  const navigateTo = useCallback(
    (path: string) => {
      const proceeded = attemptNavigation(path);
      if (proceeded) {
        setMobileOpen(false);
        setDropdownOpen(false);
      }
    },
    [attemptNavigation],
  );

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter((item) => isNavVisible(item, role));

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-brown-900 h-16"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="h-full max-w-[90rem] mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <button
          onClick={() => navigateTo('/projects')}
          className="font-mono font-bold text-cream-50 text-lg tracking-tight cursor-pointer select-none hover:text-accent-300 transition-colors duration-200"
          aria-label="Go to Projects"
        >
          LenconDB
        </button>

        {/* ── Desktop links ────────────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.path)}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium
                transition-colors duration-200 cursor-pointer
                ${isActive(item.path)
                  ? 'text-accent-300'
                  : 'text-cream-200 hover:text-cream-50 hover:bg-brown-800'}
              `}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>

              {/* Overdue badge on Expenses (Admin only) */}
              {item.key === 'expenses' &&
                overdueSummary &&
                overdueSummary.count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-semibold px-1"
                    title={`${overdueSummary.count} overdue (${overdueSummary.totalAmount.toLocaleString('ru-RU')} р.)`}
                    role="status"
                  >
                    {overdueSummary.count}
                  </span>
                )}
            </button>
          ))}
        </div>

        {/* ── Right section: user dropdown + hamburger ─────────────── */}
        <div className="flex items-center gap-2">
          {/* Desktop user dropdown */}
          {user && (
            <div className="hidden lg:block relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-cream-200 hover:text-cream-50 hover:bg-brown-800 transition-colors duration-200 cursor-pointer"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-cream-200 text-brown-900 text-xs font-semibold">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <span className="max-w-[120px] truncate">{user.firstName}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-56 bg-cream-50 border border-[rgba(34,21,13,0.15)] rounded-xl py-1 z-50"
                  style={{
                    animation: 'dropdownEnter 0.2s ease forwards',
                  }}
                  role="menu"
                >
                  {/* User info */}
                  <div className="px-3 py-2 border-b border-[rgba(34,21,13,0.10)]">
                    <p className="text-sm font-medium text-brown-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-brown-500">{user.role}</p>
                  </div>

                  <button
                    onClick={() => {
                      navigateTo('/profile');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-brown-800 hover:bg-[rgba(34,21,13,0.04)] transition-colors duration-150 cursor-pointer"
                    role="menuitem"
                  >
                    {t('navigation.profile')}
                  </button>

                  <div className="border-t border-[rgba(34,21,13,0.10)]">
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-[rgba(156,60,40,0.06)] transition-colors duration-150 cursor-pointer"
                      role="menuitem"
                    >
                      {t('auth.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-10 h-10 text-cream-200 hover:text-cream-50 cursor-pointer"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile overlay ───────────────────────────────────────────── */}
      <div
        className={`
          fixed inset-0 top-0 bg-brown-900 z-40 lg:hidden
          flex flex-col
          transition-transform duration-[450ms] ease-out
          ${mobileOpen ? 'translate-y-0' : '-translate-y-full'}
        `}
        aria-hidden={!mobileOpen}
      >
        {/* Mobile header (mirrors desktop) */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <button
            onClick={() => navigateTo('/projects')}
            className="font-mono font-bold text-cream-50 text-lg tracking-tight cursor-pointer"
          >
            LenconDB
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center w-10 h-10 text-cream-200 hover:text-cream-50 cursor-pointer"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile nav links */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-8 flex flex-col gap-1">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.path)}
              className={`
                relative flex items-center gap-3 px-4 py-3 rounded text-base font-medium
                transition-colors duration-200 cursor-pointer
                ${isActive(item.path)
                  ? 'text-accent-300 bg-brown-800'
                  : 'text-cream-200 hover:text-cream-50 hover:bg-brown-800'}
              `}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>

              {item.key === 'expenses' &&
                overdueSummary &&
                overdueSummary.count > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-semibold px-1.5">
                    {overdueSummary.count}
                  </span>
                )}
            </button>
          ))}

          {/* Mobile user section */}
          {user && (
            <div className="mt-auto pt-6 border-t border-brown-800">
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-cream-200 text-brown-900 text-sm font-semibold">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream-50 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-brown-400">{user.role}</p>
                </div>
              </div>

              <button
                onClick={() => navigateTo('/profile')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cream-200 hover:text-cream-50 hover:bg-brown-800 rounded transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                {t('navigation.profile')}
              </button>

              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-brown-800 rounded transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown enter animation — injected once */}
      <style>{`
        @keyframes dropdownEnter {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
