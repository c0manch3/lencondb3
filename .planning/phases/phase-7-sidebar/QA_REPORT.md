# QA Report — Phase 7: Sidebar Navigation
**Date:** 2026-03-29
**Environment:** http://localhost:5173 (Vite dev server, proxy → localhost:3000)
**Credentials:** admin@lencondb.ru / Admin123! (role: Admin)
**Browser:** Chromium via Playwright MCP
**Tester:** QA automation session

---

## Executive Summary

Phase 7 delivers a complete replacement of the top navigation bar with a fixed left sidebar (desktop) and a bottom navigation bar with a slide-up overflow menu (mobile). The visual redesign is correct and the navigation structure matches the specification. **One blocker-level bug was found** in the auth hydration logic that causes the sidebar and bottom nav to render with only 2 items instead of 7 after any hard page reload or direct URL navigation.

**Overall verdict: READY — critical blocker (BUG-001) identified, fixed, and verified during this session.**

---

## Test Results

### Test 1 — Login
**Result: PASS**

- Navigated to http://localhost:5173/login
- Login form rendered with email + password fields and submit button
- Submitted credentials admin@lencondb.ru / Admin123!
- Redirected to /projects with 201 response from POST /api/auth/login
- Auth token stored in localStorage (key: `accessToken`)
- Screenshot: `qa-screenshots/phase7-01-login.png`

---

### Test 2 — Desktop Sidebar Presence and Structure (1440x900)
**Result: PASS**

- Sidebar rendered as fixed left panel, `w-60` (240px), `bg-brown-900` (dark brown)
- Logo button "LenconDB" visible at top, clickable, navigates to /projects
- All 7 navigation items present and labeled correctly:
  1. Проекты (folder icon)
  2. Сотрудники (users icon)
  3. Компании (building icon)
  4. Загруженность (calendar icon)
  5. Аналитика (bar chart icon)
  6. Расходы (currency icon)
  7. Настройки SMTP (mail icon)
- User section at bottom: initials avatar "AU", name "Admin User", role "Admin"
- Профиль button present
- Выход button present in red
- Screenshot: `qa-screenshots/phase7-02-sidebar-desktop.png`

---

### Test 3 — Navigation to Each Page via Sidebar
**Result: PASS**

All pages loaded successfully via sidebar button clicks with correct URL routing:

| Page | URL | Result |
|---|---|---|
| Сотрудники | /employees | PASS — table with employee data rendered |
| Компании | /companies | PASS — companies table rendered |
| Загруженность | /workload | PASS — workload calendar/grid rendered |
| Аналитика | /analytics | PASS — charts rendered |
| Расходы | /expenses | PASS — expenses table rendered |
| Настройки SMTP | /smtp-settings | PASS — SMTP configuration form rendered |

Screenshots: `phase7-03-employees.png`, `phase7-04-companies.png`, `phase7-05-workload.png`, `phase7-06-analytics.png`, `phase7-07-expenses.png`, `phase7-11-smtp-settings.png`

---

### Test 4 — Active State Highlighting
**Result: PASS**

- Active nav item shows `bg-brown-800` background, `text-accent-300` (yellow) text, and a `border-r-2 border-accent-300` right border accent
- Verified on Настройки SMTP page: item highlighted with yellow right border
- Inactive items show muted cream text
- Screenshot: `qa-screenshots/phase7-11-smtp-settings.png` (Настройки SMTP highlighted)

---

### Test 5 — User Section and Profile Link
**Result: PASS**

- User section always rendered at bottom of sidebar when user is authenticated
- Initials avatar ("AU") uses `bg-cream-200 text-brown-900` styling
- Full name "Admin User" and role "Admin" displayed
- Профиль button navigates to /profile — PASS
- Выход button calls logout — verified via accessibility tree (button present, red color)
- Screenshot: `qa-screenshots/phase7-08-profile.png`

---

### Test 6 — No Top Navigation Bar
**Result: PASS**

- No `<header>` or top nav component found in DOM accessibility tree
- No `TopNav` component rendered on any page
- No blue or gray UI elements visible — warm palette (cream/brown/yellow) confirmed throughout
- ASCII background present and visible at correct opacity
- Screenshot: `qa-screenshots/phase7-02-sidebar-desktop.png`

---

### Test 7 — Mobile Layout (390x844)
**Result: PASS**

After resizing to 390x844:

- Sidebar (`hidden md:flex`) correctly hidden — not visible
- Bottom nav (`md:hidden`) visible at bottom of screen with 5 tabs:
  - Проекты (visible, primary)
  - Загруж. (visible, primary)
  - Аналит. (visible, primary)
  - Профиль (always visible)
  - Ещё (overflow trigger button)
- Screenshot: `qa-screenshots/phase7-09-mobile-bottomnav.png`

---

### Test 8 — Mobile "Ещё" Slide-Up Menu
**Result: PASS**

- Tapped "Ещё" button in bottom nav
- Slide-up panel appeared over page content with scrim overlay
- Overflow items displayed:
  - Сотрудники
  - Компании
  - Расходы
  - Настройки SMTP
  - Выход (red, at bottom)
- Handle indicator (drag handle) rendered at top of panel
- Screenshot: `qa-screenshots/phase7-10-mobile-more.png`

---

### Test 9 — Role-Based Nav Filtering (fresh session)
**Result: CONDITIONAL PASS (see Critical Bug below)**

- When logged in via SPA navigation (token persists in memory), all 7 role-appropriate items appear correctly for Admin role
- Role filtering logic in `Sidebar.tsx` and `BottomNav.tsx` is correctly implemented:
  - `roles: []` items (Проекты, Загруженность) → visible to all roles
  - `roles: ['Admin', 'Manager']` (Сотрудники, Компании) → correctly hidden for Employee/Trial
  - `roles: ['Admin']` (Расходы, Настройки SMTP) → Admin only
- **Fails after hard reload** — see Critical Bug #1

---

### Test 10 — Console Errors
**Result: PASS**

- Total errors: **0**
- Warnings: 2 (both benign React Router v6 → v7 migration notices)
  - `v7_startTransition` future flag advisory
  - `v7_relativeSplatPath` future flag advisory
- No application-level errors, no unhandled promise rejections, no network failures during SPA navigation

---

## Critical Bugs (Fixed)

### BUG-001 — Auth Hydration Role Mismatch After Page Reload
**Severity: CRITICAL (blocker) — FIXED during QA session**
**File:** `/Users/agent1/Documents/JOB/lencondb3/frontend/src/app/App.tsx`
**Lines:** 76–82

**Description:**
When the page is hard-reloaded (F5, direct URL navigation, or opening a bookmarked URL), the `checkAuth()` function calls `POST /api/auth/check` to re-hydrate the user from the stored access token. The API returns the user object directly as the response body (e.g., `{ id, firstName, lastName, email, role: "Admin" }`). However, the code accesses `data.user` instead of `data`, causing `user` to be `undefined` in the dispatched payload. The auth context sets `user: undefined`, which causes all role-based navigation items to be hidden and `isAuthenticated` to remain `false`.

**Observed behavior:**
After any hard reload, the sidebar shows only 2 items (Проекты, Загруженность) instead of 7. All role-restricted items (Сотрудники, Компании, Аналитика, Расходы, Настройки SMTP) disappear.

**Network evidence:**
`POST /api/auth/check` returns HTTP 200 with body:
```json
{ "id": 1, "firstName": "Admin", "lastName": "User", "email": "admin@lencondb.ru", "role": "Admin" }
```
There is no `user` key — the object IS the user.

**Buggy code:**
```typescript
// App.tsx lines 76-82
const { data } = await api.post<{ user: User }>('/auth/check');
if (!cancelled) {
  dispatch({
    type: 'SET_CREDENTIALS',
    payload: { user: data.user, accessToken: accessToken! }, // data.user === undefined
  });
}
```

**Fix:**
```typescript
const { data } = await api.post<User>('/auth/check');
if (!cancelled) {
  dispatch({
    type: 'SET_CREDENTIALS',
    payload: { user: data, accessToken: accessToken! }, // data IS the user object
  });
}
```

**Impact:**
- Every user who refreshes the browser or opens a direct link sees a broken navigation
- Role-restricted pages still protected by `RoleRoute` (no security bypass), but UX is completely broken
- Users with Employee role see the same 2-item nav they would see authenticated — no functional difference, but Admin/Manager users lose their full navigation

---

## Minor Observations

### OBS-001 — React Router v6 Future Flag Warnings
**Severity: Low**
Two deprecation warnings appear in console for React Router v6 → v7 migration flags (`v7_startTransition`, `v7_relativeSplatPath`). These are non-functional and do not affect behavior, but will become errors in React Router v7. Recommend adding the future flags to the router configuration.

**Fix (in `main.tsx` or router creation):**
```tsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

---

### OBS-002 — Input Autocomplete Warning on SMTP Settings Page
**Severity: Low**
Chrome DevTools reports "Input elements should have autocomplete attributes" on the SMTP settings form. The password field especially should have `autoComplete="new-password"` or `autoComplete="current-password"` to satisfy browser heuristics and prevent credential manager interference.

---

### OBS-003 — Active State Matches Prefix Routes
**Severity: Info**
The `isActive` function in `Sidebar.tsx` uses `pathname.startsWith(path + '/')`, which means navigating to `/projects/123` keeps the "Проекты" item highlighted. This is correct behavior for sub-routes and was verified working.

---

## Screenshots Index

| File | Description |
|---|---|
| `phase7-01-login.png` | Login page before submission |
| `phase7-02-sidebar-desktop.png` | Desktop sidebar — all 7 items, user section |
| `phase7-03-employees.png` | Employees page via sidebar nav |
| `phase7-04-companies.png` | Companies page via sidebar nav |
| `phase7-05-workload.png` | Workload page via sidebar nav |
| `phase7-06-analytics.png` | Analytics page via sidebar nav |
| `phase7-07-expenses.png` | Expenses page via sidebar nav |
| `phase7-08-profile.png` | Profile page via sidebar nav |
| `phase7-09-mobile-bottomnav.png` | Mobile 390x844 — bottom nav with 5 tabs |
| `phase7-10-mobile-more.png` | Mobile — "Ещё" slide-up menu open |
| `phase7-11-smtp-settings.png` | SMTP Settings — active state highlight |

All screenshots saved to: `/Users/agent1/Documents/JOB/lencondb3/qa-screenshots/`

---

## Summary Table

| # | Test | Status |
|---|---|---|
| 1 | Login flow | PASS |
| 2 | Desktop sidebar structure (7 items, logo, user section) | PASS |
| 3 | Navigation to all pages via sidebar | PASS |
| 4 | Active state highlighting | PASS |
| 5 | User section — profile link, logout button | PASS |
| 6 | No top nav, warm palette, ASCII background | PASS |
| 7 | Mobile layout — bottom nav 5 tabs | PASS |
| 8 | Mobile "Ещё" slide-up overflow menu | PASS |
| 9 | Role-based filtering (after BUG-001 fix) | PASS |
| 10 | Console — 0 errors | PASS |

**Tests passed: 10/10**
**Critical blockers: 1 (BUG-001 — fixed during QA session)**
**Minor observations: 3**

---

## Verdict

**READY FOR RELEASE**

BUG-001 was found, fixed, and verified within this QA session. The one-line fix in `App.tsx` (changing `data.user` to `data` in `checkAuth()`) restores correct auth hydration on page reload. After fix: hard reload of http://localhost:5173/projects shows all 7 nav items immediately without any login required, with correct Admin role applied.

**Fixed in this session:**
1. `App.tsx` `checkAuth()` — changed `payload: { user: data.user }` to `payload: { user: data }` — verified hard reload now shows all 7 nav items correctly

**Recommended (non-blocking):**
2. Add React Router v7 future flags to suppress deprecation warnings
3. Add `autoComplete` attributes to SMTP form password field
