import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthState, useAuthDispatch } from '@/store/AuthContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning';
import { useOverdueBadge } from '@/hooks/useOverdueBadge';

/**
 * Navigation items configuration.
 * `roles` restricts visibility to specific user roles.
 * When `roles` is omitted, the item is visible to all authenticated users.
 */
interface NavItem {
  key: string;
  href: string;
  icon: string;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    key: 'projects',
    href: '/projects',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
  {
    key: 'employees',
    href: '/employees',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['Admin', 'Manager'],
  },
  {
    key: 'companies',
    href: '/companies',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    roles: ['Admin', 'Manager'],
  },
  {
    key: 'workload',
    href: '/workload',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'analytics',
    href: '/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    roles: ['Admin', 'Manager', 'Trial'],
  },
  {
    key: 'expenses',
    href: '/expenses',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['Admin'],
  },
  {
    key: 'smtpSettings',
    href: '/smtp-settings',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    roles: ['Admin'],
  },
];

export default function TopNav() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const navigate = useNavigate();
  const { attemptNavigation } = useUnsavedChanges();
  const { count: overdueCount, totalAmount: overdueTotalAmount } = useOverdueBadge();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU';
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB' }).format(amount);

  const filteredNavigation = navigationItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = useCallback(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }, [dispatch, navigate]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!attemptNavigation(href)) {
        e.preventDefault();
      } else {
        setMobileMenuOpen(false);
      }
    },
    [attemptNavigation]
  );

  const handleProfileClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!attemptNavigation('/profile')) {
        e.preventDefault();
      } else {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    },
    [attemptNavigation]
  );

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  // Close user dropdown on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenuOpen]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-brown-900 safe-top"
      role="navigation"
      aria-label={t('navigation.main', 'Main navigation')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <NavLink
              to="/projects"
              onClick={(e) => handleNavClick(e, '/projects')}
              className="font-mono text-cream-50 font-bold text-xl tracking-tight hover:text-accent-300 transition-colors duration-200"
              aria-label="LenconDB home"
            >
              LenconDB
            </NavLink>
          </div>

          {/* Desktop navigation links */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-[0.4rem] transition-all duration-200 ${
                    isActive
                      ? 'text-accent-300 bg-brown-800'
                      : 'text-cream-100 hover:text-cream-50 hover:bg-brown-800'
                  }`
                }
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span>{t(`navigation.${item.key}`)}</span>
                {item.key === 'expenses' && overdueCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[18px] text-center"
                    title={t('finance.overdueTooltip', {
                      count: overdueCount,
                      amount: formatCurrency(overdueTotalAmount),
                    })}
                  >
                    {overdueCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right side: user menu (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            {/* Desktop user dropdown */}
            <div className="hidden lg:block relative">
              <button
                ref={userMenuButtonRef}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[0.4rem] text-cream-100 hover:text-cream-50 hover:bg-brown-800 transition-all duration-200"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                {user && (
                  <>
                    <div className="w-8 h-8 bg-brown-700 rounded-full flex items-center justify-center border border-brown-600">
                      <span className="text-cream-100 text-sm font-medium">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium max-w-[120px] truncate">
                      {user.firstName}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </button>

              {/* Dropdown menu */}
              {userMenuOpen && (
                <div
                  ref={userMenuRef}
                  className="absolute right-0 mt-2 w-56 origin-top-right bg-cream-50 border border-brown-200 rounded-[0.4rem] shadow-lg py-1 animate-in fade-in"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {user && (
                    <div className="px-4 py-3 border-b border-brown-100">
                      <p className="text-sm font-medium text-brown-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-brown-500 mt-0.5">{user.role}</p>
                    </div>
                  )}
                  <NavLink
                    to="/profile"
                    onClick={handleProfileClick}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-brown-700 hover:bg-brown-50 hover:text-brown-900 transition-colors duration-150"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {t('navigation.profile')}
                  </NavLink>
                  <div className="border-t border-brown-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-[0.4rem] text-cream-100 hover:text-cream-50 hover:bg-brown-800 transition-all duration-200"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? t('navigation.closeMenu', 'Close menu') : t('navigation.menu', 'Open menu')}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down overlay (OpenHands style) */}
      <div
        className={`lg:hidden fixed inset-x-0 top-16 bottom-0 bg-brown-900 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-y-0' : '-translate-y-full pointer-events-none'
        }`}
        style={{ backdropFilter: 'blur(8px)' }}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Navigation links */}
          <div className="px-4 py-6 space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                tabIndex={mobileMenuOpen ? 0 : -1}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-[0.4rem] transition-all duration-200 ${
                    isActive
                      ? 'text-accent-300 bg-brown-800'
                      : 'text-cream-100 hover:text-cream-50 hover:bg-brown-800'
                  }`
                }
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span>{t(`navigation.${item.key}`)}</span>
                {item.key === 'expenses' && overdueCount > 0 && (
                  <span
                    className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full min-w-[20px] text-center"
                    title={t('finance.overdueTooltip', {
                      count: overdueCount,
                      amount: formatCurrency(overdueTotalAmount),
                    })}
                  >
                    {overdueCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile user section */}
          <div className="mt-auto border-t border-brown-800 p-4">
            {user && (
              <NavLink
                to="/profile"
                onClick={handleProfileClick}
                tabIndex={mobileMenuOpen ? 0 : -1}
                className="flex items-center gap-3 px-4 py-3 rounded-[0.4rem] hover:bg-brown-800 transition-colors duration-200"
              >
                <div className="w-10 h-10 bg-brown-700 rounded-full flex items-center justify-center border border-brown-600">
                  <span className="text-cream-100 text-sm font-medium">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-cream-50">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-cream-300">{user.role}</p>
                </div>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              tabIndex={mobileMenuOpen ? 0 : -1}
              className="w-full flex items-center gap-3 mt-2 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-brown-800 rounded-[0.4rem] transition-colors duration-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
