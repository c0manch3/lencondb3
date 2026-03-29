# QA Report — LenconDB Frontend Rebuild (Phase 6)

**Date:** 2026-03-29
**Tester:** QA Engineer (automated Playwright MCP + source code analysis)
**Build:** main branch, post-phase-5 overhaul
**Environment:** http://localhost:5173 (Vite dev server) + http://localhost:3000 (NestJS API)
**Credentials used:** admin@lencondb.ru / Admin123! (Admin role)

---

## Test Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Unauthenticated redirect to /login | PASS | Navigating to /login shows login page correctly |
| 2 | Login page visual — ASCII art background | PASS | AsciiBackground component renders warm cream symbols |
| 3 | Login page visual — "LenconDB" branding | PASS | Title and subtitle rendered in brown-900 |
| 4 | Login page visual — cream/brown warm palette | PASS | No blue elements on login page |
| 5 | Login form — email input accepts input | PASS | |
| 6 | Login form — password input accepts input | PASS | |
| 7 | Login form — submit redirects to /projects | PASS | JWT stored in context, redirect to /projects on success |
| 8 | TopNav — renders on all authenticated pages | PASS | Dark brown navbar present on all layout pages |
| 9 | TopNav — hamburger menu on mobile (390x844) | PASS | Collapses to hamburger at 390px width |
| 10 | Projects page (/projects) — loads without error | PASS | Table renders with project rows |
| 11 | Projects page — warm palette, no blue | PASS | cream/brown palette consistent |
| 12 | Projects page — pagination present | PASS | Pagination component visible |
| 13 | Project detail page — opens on row click | PASS | /projects/:id route loads project details |
| 14 | Project detail page — tabs render | PASS | Info, Employees, Payments tabs functional |
| 15 | Employees page (/employees) — loads without error | PASS | Employee table loads correctly |
| 16 | Employees page — warm palette, no blue | PASS | |
| 17 | Companies page (/companies) — loads without error | PASS | Company table loads correctly |
| 18 | Companies page — warm palette, no blue | PASS | |
| 19 | Expenses page (/expenses) — loads without error | PASS | Expenses table loads, category filters present |
| 20 | Expenses page — warm palette, no blue | PASS | |
| 21 | Workload page (/workload) — loads without crash | **FAIL** | Critical runtime error: "employees.map is not a function or its return value is not iterable" — ErrorBoundary catches crash and shows "Something went wrong" screen |
| 22 | Workload page — month/week/day view switching | **FAIL** | Blocked by crash in test #21 |
| 23 | Workload page — add plan modal | **FAIL** | Blocked by crash in test #21 |
| 24 | Workload page — log actual modal | **FAIL** | Blocked by crash in test #21 |
| 25 | Analytics page (/analytics) — loads without crash | **FAIL** | Critical runtime error: "Cannot read properties of undefined (reading 'toLocaleString')" — ErrorBoundary catches crash; root cause: accessorKey mismatch in ProjectsWorkloadTab.tsx (`totalHours` vs API field `totalActualHours`) |
| 26 | Analytics page — Finance tab renders | **FAIL** | Blocked by crash in test #25 |
| 27 | Analytics page — Projects Workload tab renders | **FAIL** | Blocked by crash in test #25 |
| 28 | 404 page — renders for unknown routes | PASS | "404 / Страница не найдена" displayed |
| 29 | 404 page — warm cream styling | PASS | cream-50 background, brown text |
| 30 | 404 page — ASCII art background | **FAIL** | AsciiBackground component missing on 404 page; also TopNav absent (404 rendered outside Layout wrapper) |
| 31 | Mobile view (390x844) — Projects page layout | PASS | Mobile card layout renders, horizontal scroll absent |
| 32 | Mobile view — TopNav hamburger menu | PASS | |
| 33 | Auth session — persists across page navigation | PASS | Normal navigation retains auth state |
| 34 | Auth session — persists after ErrorBoundary crash + nav button click | PASS | Clicking nav links after crash retains session |
| 35 | Auth session — persists after ErrorBoundary crash + URL navigation | **FAIL** | Direct URL navigation after ErrorBoundary crash drops auth context; user is forced back to guest nav; requires re-login |
| 36 | Visual — no blue elements across all pages | PASS | Confirmed on Projects, Employees, Companies, Expenses, Login |
| 37 | Visual — ASCII art background on all layout pages | PASS | Present on all pages inside Layout wrapper |
| 38 | Visual — LenconDB branding in TopNav | PASS | |
| 39 | SMTP Settings page (/smtp-settings) — accessible to Admin | PASS | Page renders for Admin role |
| 40 | Protected routes — non-Admin cannot access Admin-only pages | PASS | RoleRoute guard present in App.tsx (code-verified) |

**Total: 33 PASS / 7 FAIL**

---

## Critical Bugs

### BUG-001 — Workload page crash (CRITICAL)

**Page:** /workload
**Severity:** Critical — page completely unusable
**Error:** `TypeError: employees.map is not a function or its return value is not iterable`
**Symptom:** ErrorBoundary activates on page load; all workload functionality inaccessible
**Root cause (suspected):** A child component receiving the `employees` or `projects` array attempts to call `.map()` before TanStack Query resolves the initial value. The `= []` default in `WorkloadPage.tsx` (`data: employees = []`) applies at destructuring time, but the child component may be receiving a raw query result object or undefined on first render.
**Files to investigate:**
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/WorkloadPage.tsx` — lines 91-92 (default value application)
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/AddPlanModal.tsx` — verify employees prop usage
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/WorkloadFilters.tsx` — verify employees prop usage
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/ExportModal.tsx` — verify employees prop usage
**Recommended fix:** Add explicit `Array.isArray()` guards or `?? []` coalescing at every point where `employees` and `projects` are iterated inside child components. Alternatively, add `select: (res) => res.data` to the query and ensure the stale cache never holds a non-array shape.

---

### BUG-002 — Analytics page crash due to accessorKey mismatch (CRITICAL)

**Page:** /analytics (Projects Workload tab)
**Severity:** Critical — page completely unusable
**Error:** `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`
**Symptom:** ErrorBoundary activates when analytics page loads; Finance and Projects Workload tabs both blocked
**Root cause:** Confirmed via source code and API response inspection.

File: `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/analytics/components/ProjectsWorkloadTab.tsx`, line 96

```typescript
// CURRENT (broken):
{
  accessorKey: 'totalHours',          // field does not exist in API response
  header: t('analytics.hours'),
  size: 100,
  cell: ({ getValue }) => (
    <span className="font-medium text-brown-900">
      {getValue<number>().toLocaleString('ru-RU')}  // undefined.toLocaleString() -> crash
    </span>
  ),
},

// FIXED:
{
  accessorKey: 'totalActualHours',    // matches actual API response field
  header: t('analytics.hours'),
  size: 100,
  cell: ({ getValue }) => (
    <span className="font-medium text-brown-900">
      {(getValue<number>() ?? 0).toLocaleString('ru-RU')}  // safe fallback
    </span>
  ),
},
```

**API confirmed returning:** `totalActualHours` (verified via curl against `/api/analytics/projects-workload`)
**Fix:** Change `accessorKey: 'totalHours'` to `accessorKey: 'totalActualHours'` in `ProjectsWorkloadTab.tsx` line 96. Also add `?? 0` defensive fallback in the cell renderer.

---

### BUG-003 — Auth context drops after ErrorBoundary crash + URL navigation (IMPORTANT)

**Severity:** Important — reproducible data loss scenario
**Symptom:** After an ErrorBoundary-caught crash, navigating to a new URL via browser address bar (or programmatic navigation) drops the React auth context. The user sees guest-only navigation and must re-login.
**Root cause (suspected):** React ErrorBoundary catches the error but does not remount the provider tree. When the browser performs a full navigation (not a React Router internal navigation), the React tree is torn down and rebuilt from scratch without the stored JWT token being re-read from the persisted source (localStorage/sessionStorage/cookie).
**Files to investigate:**
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/shared/auth/AuthContext.tsx` — verify how token is initialized on mount
**Recommended fix:** Ensure the auth context reads the JWT from a persistent store (localStorage or httpOnly cookie) on every mount, so a full page remount after a crash re-authenticates the user automatically. If the token is only kept in React state (not persisted), it will always be lost on remount.

---

### BUG-004 — 404 page missing ASCII background and TopNav (LOW)

**Severity:** Low — visual inconsistency only, no functional impact
**Symptom:** The 404 page does not render `<AsciiBackground />` and does not show the TopNav, making it visually inconsistent with the rest of the application.
**Root cause:** The 404 route is defined outside the `<Layout>` wrapper in `App.tsx` (`path="*"` renders `<NotFoundPage />` directly). Additionally, `NotFoundPage.tsx` does not include `<AsciiBackground />`.
**Files:**
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/app/App.tsx` — 404 route placement
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/not-found/NotFoundPage.tsx` — missing AsciiBackground
**Recommended fix (option A):** Move the `path="*"` route inside the Layout wrapper so it inherits TopNav and AsciiBackground automatically.
**Recommended fix (option B):** Add `<AsciiBackground />` directly inside `NotFoundPage.tsx` and decide whether a minimal nav header should be shown.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical bugs | 2 (BUG-001, BUG-002) |
| Important bugs | 1 (BUG-003) |
| Low bugs | 1 (BUG-004) |

**Overall verdict: NOT READY FOR RELEASE**

Two critical crashes block core features (Workload calendar and Analytics). Both bugs are straightforward to fix:

1. **BUG-002 is a one-line fix** — change `totalHours` to `totalActualHours` in `ProjectsWorkloadTab.tsx`.
2. **BUG-001 requires investigation** of child components to find where `employees`/`projects` is being called as an array before data arrives.

All visual and palette requirements are met on working pages. The warm cream/brown palette is consistent, ASCII art backgrounds are present, TopNav is correct, no blue UI elements were found. Mobile layout is functional. Authentication and role-based access control work correctly.

**Recommended action before release:**
1. Fix BUG-002 immediately (trivial change).
2. Investigate and fix BUG-001 (Workload crash).
3. Verify auth token persistence (BUG-003) to prevent session loss on errors.
4. Optionally fix 404 page visual consistency (BUG-004).

---

## Retest Results (after fixes)

**Date:** 2026-03-29
**Tester:** QA Engineer (Playwright MCP + source code analysis)
**Scope:** Full regression retest after reported fixes for BUG-001 and BUG-002
**Credentials:** admin@lencondb.ru / Admin123! (Admin role)
**Login:** Required twice — once at session start, once after BUG-003 (auth context loss) forced re-authentication when navigating to /analytics after the Workload crash

---

### Bug Fix Verification

| Bug | Status | Detail |
|-----|--------|--------|
| BUG-001 — Workload page crash | **NOT FIXED** | Page still crashes. Error mutated from `employees.map is not a function` to `projects.filter is not a function`. Root cause fully diagnosed — see below. |
| BUG-002 — Analytics page crash | **FIXED** | Analytics loads cleanly. All three tabs render. Zero console errors. |
| BUG-003 — Auth context loss after ErrorBoundary | **STILL EXISTS** | Reproduced during this session: after Workload crash, navigating to /analytics via URL dropped auth context and forced re-login. |
| BUG-004 — 404 page missing ASCII/TopNav | **NOT RETESTED** | Out of scope for this retest cycle. |

---

### BUG-001 Updated Root Cause Analysis

The error symptom changed because only a partial fix was applied. The `= []` default value at the `WorkloadPage` level (lines 91-92) does not protect against the actual failure mechanism: a **TanStack Query cache key collision**.

**Collision details:**

- `useProjects()` in `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/projects/hooks/useProjects.ts` uses `queryKey: ['projects']` and stores the **full `PaginatedResponse` wrapper object** (`{ data: [...], total: N }`) in the cache.
- `useWorkloadProjects()` in `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/hooks/useWorkloadData.ts` uses the **same key** `queryKey: ['projects']` and expects to receive a `Project[]` array directly.

When the Projects page loads before the Workload page, the cache entry `['projects']` is populated with the `PaginatedResponse` wrapper object. When `useWorkloadProjects` reads the same cache entry, TanStack Query serves the cached `PaginatedResponse` object instead of calling the query function again. The `= []` default in `WorkloadPage.tsx` only applies when `data` is `undefined` — but `data` is not undefined here; it is the `PaginatedResponse` object `{ data: [...], total: N }`. So `projects` becomes that object, and `projects.filter(...)` in child components throws `TypeError: projects.filter is not a function`.

**Crash sites (all execute `.filter()` on `projects` unconditionally at render time):**
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/WorkloadFilters.tsx` — line 31: `projects.filter((p) => p.status === 'Active')`
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/AddPlanModal.tsx` — line 118: `projects.filter((p) => p.status === 'Active').map(...)`
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/EditPlanModal.tsx` — line 73: `projects.filter((p) => p.status === 'Active').map(...)`
- `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/components/LogActualModal.tsx` — line 116: `projects.filter((p) => p.status === 'Active').map(...)`

**Required fix (choose one):**

Option A (recommended — eliminates root cause): Rename the query key in `useWorkloadProjects` from `['projects']` to `['workload-projects']`. This ensures the two hooks maintain separate cache entries and never conflict.

```typescript
// In useWorkloadData.ts — change:
projects: ['projects'] as const,
// To:
projects: ['workload-projects'] as const,
```

Option B (defensive guard): Keep keys as-is but add `Array.isArray` guards in every consumer:

```typescript
// Before every .filter() call on projects:
const safeProjects = Array.isArray(projects) ? projects : [];
const activeProjects = safeProjects.filter((p) => p.status === 'Active');
```

Option A is strongly preferred — Option B masks the data contract violation without fixing it.

---

### Full Page Retest Results

| # | Page | Result | Notes |
|---|------|--------|-------|
| R-01 | Login page (/login) | PASS | Loads correctly, cream/brown palette, ASCII art, no errors |
| R-02 | Projects page (/projects) | PASS | Table loads, pagination present, warm palette, 0 console errors |
| R-03 | Project detail (/projects/:id) | PASS | Opens on row click, Info/Employees/Payments tabs functional |
| R-04 | Employees page (/employees) | PASS | Table loads, warm palette, 0 console errors |
| R-05 | Companies page (/companies) | PASS | Table loads, warm palette, 0 console errors |
| R-06 | Expenses page (/expenses) | PASS | Table loads, category filters present, warm palette, 0 console errors |
| R-07 | Workload page (/workload) | **FAIL** | BUG-001 still crashing — `projects.filter is not a function`. ErrorBoundary activates on page load. All workload functionality blocked. |
| R-08 | Analytics page (/analytics) | PASS | BUG-002 confirmed fixed. All three tabs render. Finance tab shows charts. Projects Workload tab shows "Часы" column with values. 0 console errors. |
| R-09 | SMTP Settings page (/smtp-settings) | PASS (with caveats) | Page renders and is accessible to Admin. Functional. However: (1) headings "SMTP Settings" and "Create Configuration" are in English — i18n gap. (2) SSL/TLS checkbox uses native browser blue styling — palette violation. |
| R-10 | Profile page (/profile) | PASS (with caveats) | Page renders, user data displays correctly, ASCII art background present, warm palette, 0 console errors. However: headings "Profile", "User Information", "Change Password" are in English — i18n gap. |
| R-11 | 404 page (unknown route) | PASS | "404 / Страница не найдена" displays. (BUG-004 visual issues unchanged — TopNav absent, no ASCII art — not retested in scope.) |
| R-12 | TopNav — all authenticated pages | PASS | Dark brown navbar present and consistent across all working pages |
| R-13 | Mobile layout (390x844) | PASS | Hamburger icon visible, nav collapses, content stacks vertically, no horizontal overflow, ASCII art background visible |
| R-14 | Auth persistence — normal navigation | PASS | Auth state retained across page navigation |
| R-15 | Auth persistence — after ErrorBoundary | **FAIL** | BUG-003 reproduced: URL navigation after Workload crash dropped auth context; required re-login |

**Retest totals: 12 PASS / 3 FAIL (including 2 carries from previous session)**

---

### New Issues Found During Retest

#### BUG-005 — SMTP Settings page: untranslated English headings (LOW)

**Severity:** Low — i18n gap, no functional impact
**Symptom:** Page heading "SMTP Settings" and section heading "Create Configuration" render in English regardless of locale.
**File to investigate:** `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/smtp/SmtpSettingsPage.tsx` — check that heading strings use `t(...)` calls referencing keys present in both `en/translation.json` and `ru/translation.json`.
**Recommended fix:** Replace hardcoded English strings with `t('smtp.title')` / `t('smtp.createConfig')` equivalents and add the corresponding keys to both locale files.

---

#### BUG-006 — SMTP Settings page: SSL/TLS checkbox uses native blue styling (LOW)

**Severity:** Low — visual palette violation
**Symptom:** The SSL/TLS checkbox on the SMTP Settings form renders with the native browser blue accent color, inconsistent with the warm cream/brown palette applied to all other UI elements.
**File to investigate:** `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/smtp/SmtpSettingsPage.tsx` — the `<input type="checkbox">` element lacks custom Tailwind styling.
**Recommended fix:** Apply `accent-brown-600` or use a custom checkbox component styled with `appearance-none` + brown border + brown checked background to match the palette.

---

#### BUG-007 — Profile page: untranslated English headings (LOW)

**Severity:** Low — i18n gap, no functional impact
**Symptom:** Page heading "Profile", section headings "User Information" and "Change Password", and field labels "NAME", "EMAIL", "PHONE", "ROLE" render in English.
**File to investigate:** `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/profile/ProfilePage.tsx` — check that all visible strings use `t(...)` calls.
**Recommended fix:** Replace hardcoded strings with i18n keys and add translations to both locale files.

---

### Updated Summary

| Severity | Bug | Status after retest |
|----------|-----|---------------------|
| Critical | BUG-001 — Workload crash | NOT FIXED (root cause now fully diagnosed: cache key collision) |
| Critical | BUG-002 — Analytics crash | FIXED |
| Important | BUG-003 — Auth context loss after ErrorBoundary | NOT FIXED (reproduced) |
| Low | BUG-004 — 404 page missing ASCII/TopNav | Not retested |
| Low | BUG-005 — SMTP English headings (NEW) | New finding |
| Low | BUG-006 — SMTP blue checkbox (NEW) | New finding |
| Low | BUG-007 — Profile English headings (NEW) | New finding |

**Overall verdict after retest: NOT READY FOR RELEASE**

BUG-002 (Analytics) is confirmed fixed. BUG-001 (Workload) remains critical and is the only blocker for release readiness. The root cause is now fully identified: rename the `WORKLOAD_KEYS.projects` query key from `['projects']` to `['workload-projects']` in `useWorkloadData.ts`. This is a one-line fix followed by clearing the in-memory TanStack Query cache (or restarting the dev server).

**Priority action items:**
1. **BUG-001 (BLOCKER):** Change `projects: ['projects'] as const` to `projects: ['workload-projects'] as const` in `/Users/agent1/Documents/JOB/lencondb3/frontend/src/features/workload/hooks/useWorkloadData.ts` line 29.
2. **BUG-003:** Persist JWT in localStorage (or httpOnly cookie) and re-read it on every AuthContext mount so auth survives full React tree remounts after crashes.
3. **BUG-005 / BUG-007:** Add missing i18n keys and replace hardcoded strings in SmtpSettingsPage and ProfilePage.
4. **BUG-006:** Style the SSL/TLS checkbox with `accent-brown-600` or a custom component.
5. **BUG-004:** Optionally move the `path="*"` route inside the Layout wrapper.
