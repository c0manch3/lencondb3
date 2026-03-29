# Phase 3: Complete Visual Redesign -- COMPLETED

**Date:** 2026-03-29
**Scope:** Full visual overhaul from generic blue/gray SaaS theme to warm cream/brown/yellow design language inspired by OpenHands.dev
**Result:** All 46 planned file operations completed. Both frontend and backend build successfully. Zero legacy color classes remaining.

---

## 1. Design System

### Color Palette

| Role              | Before            | After                                |
|-------------------|-------------------|--------------------------------------|
| Background        | `bg-white`        | `#f9f0d9` (cream-500)               |
| Surface           | `bg-gray-50`      | `#fdfaf0` (cream-50)                |
| Text primary      | `text-gray-900`   | `#22150d` (brown-900)               |
| Text secondary    | `text-gray-600`   | `#5c4a3e` (brown-600 range)         |
| Primary accent    | `blue-500`        | `#FFFF8B` (accent-300, yellow)      |
| Borders           | `border-gray-200` | `rgba(34, 21, 13, 0.15)` (CSS var)  |
| Selection         | Browser default   | Inverted: dark brown bg + cream text |

The full palette is defined in `frontend/tailwind.config.js` with 11-shade `cream`, `brown`, `accent`, and backward-compatible `primary` scales.

### CSS Custom Properties (index.css, 165 lines)

```
--bg-cream:             #f9f0d9
--text-brown:           #22150d
--accent-yellow:        #FFFF8B
--border-brown:         rgba(34, 21, 13, 0.15)
--border-brown-strong:  rgba(34, 21, 13, 0.3)
--backdrop:             rgba(32, 21, 14, 0.50)
```

### Global Styles Applied

- Anti-aliased text rendering (`-webkit-font-smoothing`, `-moz-osx-font-smoothing`)
- Custom selection colors (inverted brown/cream)
- Custom scrollbar (8px, rounded, translucent brown thumb)
- Form autofill override (cream background instead of browser blue)
- Minimum touch target enforcement (44px for buttons, links, inputs)
- Component classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.input`, `.card`, `.page-title`, `.section-title`

### Typography

- Monospace font stack for decorative elements: `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
- System font retained for body text
- Anti-aliased rendering across webkit and mozilla

### Border Radius

- Default border-radius: `0.4rem` (set in Tailwind config)
- Consistently applied across all cards, inputs, tooltips, buttons, and chart tooltips

---

## 2. Navigation Overhaul: Sidebar to TopNav

### Deleted Components (3 files removed)

| File | Status |
|------|--------|
| `frontend/src/components/layout/Sidebar.tsx` | Deleted |
| `frontend/src/components/layout/Header.tsx` | Deleted |
| `frontend/src/components/layout/BottomNav.tsx` | Deleted |

### New: TopNav (451 lines)

**File:** `frontend/src/components/layout/TopNav.tsx`

Features:
- Fixed-position dark brown bar (`bg-brown-900`) with `z-50` and `safe-top` padding
- 7 navigation items with SVG icons, role-based visibility (`roles` array per NavItem)
- Active link highlighting via `NavLink` with cream background indicator
- User dropdown menu (profile link, language toggle, logout) with outside-click and Escape-key dismissal
- Mobile hamburger menu with full-screen overlay and body scroll lock
- Overdue expense badge on the Expenses link (count + formatted currency tooltip)
- Unsaved changes integration -- blocks navigation when form has pending changes
- Full ARIA: `aria-label`, `aria-expanded`, `aria-haspopup`, `aria-orientation`, `aria-hidden`
- i18n support via `useTranslation()` for all labels

### Updated: MainLayout (24 lines)

**File:** `frontend/src/components/layout/MainLayout.tsx`

Minimal layout wrapper:
- Renders `<TopNav />` + `<Outlet />`
- Skip-to-content link for keyboard accessibility
- `pt-16` offset for fixed nav height

---

## 3. New Components

### AsciiBackground (737 lines)

**File:** `frontend/src/components/AsciiBackground.tsx`

Canvas-rendered animated ASCII art background adapted from OpenHands.dev:
- Perlin noise-driven character selection with configurable frequency, contrast, and edge width
- Character sets: `" LENCON DB @@@ "` (line set), `" .,:;*+![]{}()<>-~"` (random set), `"@"` (gap set)
- Flow animation with configurable speed, drift, and warp
- Band jitter for organic visual variation
- Streak effects (configurable count, direction, width)
- Full configuration object (`CFG`) for all visual parameters
- Renders on HTML5 `<canvas>` with monospace font

### useSmoothScroll (51 lines)

**File:** `frontend/src/hooks/useSmoothScroll.ts`

- Initializes Lenis smooth scrolling with GSAP ticker synchronization
- Config: `lerp: 0.04` (heavy smoothing), `wheelMultiplier: 0.4` (slower scroll), `syncTouch: false` (native mobile)
- Respects `prefers-reduced-motion` -- falls back to `scroll-behavior: auto`
- Proper cleanup: removes GSAP ticker callback and destroys Lenis instance

### useScrollReveal (55 lines)

**File:** `frontend/src/hooks/useScrollReveal.ts`

- Animates `[data-reveal]` elements into view using GSAP ScrollTrigger
- Config: 600ms duration, `power2.out` easing, 20px upward travel
- Trigger at 90% viewport entry, plays once (no reset)
- Respects `prefers-reduced-motion` -- skips all animations
- Cleanup: cancels RAF and kills all ScrollTrigger instances

### ScrollToTop (inline in App.tsx)

- Defined as a function component in `App.tsx` (lines 25-31)
- Resets `window.scrollTo(0, 0)` on every route change via `useLocation().pathname`

### Dependencies Added

```json
"@studio-freight/lenis": "^1.0.42"
"gsap": "^3.14.2"
```

---

## 4. Branding: ProjectDB to LenconDB

- **0 remaining "ProjectDB" references** across frontend and backend source
- **22 total "LenconDB" / "Lencon DB" references** across source files (20 in `frontend/src/`, 2 in `frontend/index.html`)
- Renamed in: page titles, meta tags, navigation labels, email templates, ASCII art character set, error messages, and toast notifications

### index.html

```html
<meta name="theme-color" content="#22150d" />
<meta name="description" content="LenconDB -- Engineering Project Management..." />
<title>LenconDB -- Engineering Project Management</title>
```

---

## 5. Pages Restyled (All 13)

Every page now uses the cream/brown/accent palette with zero legacy blue/gray/white classes.

| Page | Lines | Key Changes |
|------|-------|-------------|
| `WorkloadPage.tsx` | 2,396 | Colors-only pass on the largest file (no logic changes) |
| `ProjectsPage.tsx` | 1,029 | Card grid, status badges, search/filter UI |
| `ProjectDetailPage.tsx` | 1,014 | Detail view, tabs, inline editing |
| `AnalyticsPage.tsx` | 890 | Tab navigation, chart containers, period selector |
| `EmployeesPage.tsx` | 880 | Table, role badges, invite flow |
| `ExpensesPage.tsx` | 763 | Table, category labels, overdue indicators |
| `CompaniesPage.tsx` | 587 | CRUD cards, search |
| `SmtpSettingsPage.tsx` | 409 | Settings form, test email button |
| `ResetPasswordPage.tsx` | 219 | Auth card on dark brown background |
| `AcceptInvitePage.tsx` | 213 | Auth card on dark brown background |
| `ProfilePage.tsx` | 184 | User settings form |
| `LoginPage.tsx` | 143 | Auth card on dark brown background with AsciiBackground |
| `NotFoundPage.tsx` | 23 | Minimal 404 |
| **Total** | **8,750** | |

---

## 6. Email Templates

Both backend email templates restyled with the warm palette using inline CSS (email client compatibility):

### invite.html

**File:** `backend/src/modules/mail/templates/invite.html` (60 lines)

- Body background: `#f9f0d9` (cream)
- Card background: `#faf3e3` (warm cream)
- Header band: `#22150d` (dark brown) with white text
- CTA button: `#22150d` background, white text, 8px radius
- Footer: `#f3e8cf` background with `#7d6b5d` text
- Link color: `#8B6914` (golden brown)
- Shadow: `rgba(34, 21, 13, 0.15)`

### reset-password.html

**File:** `backend/src/modules/mail/templates/reset-password.html` (60 lines)

- Identical color scheme to invite template
- Consistent header/footer/CTA styling

---

## 7. Chart Components (Warm Palette)

All 4 analytics chart components use the warm design system:

### CategoryPieChart.tsx (87 lines)

11 category-specific warm colors:
- `#8B6914` (Salary -- golden), `#B5453A` (IncomeTax -- warm red), `#C4862B` (InsuranceContrib -- amber)
- `#7B5C8E` (SocialInsurance -- muted purple), `#3D7A7A` (SimplifiedTax -- teal), `#D47625` (VAT -- orange)
- `#A33030` (Penalty -- deep red), `#5B5FA0` (IndividualTax -- slate blue), `#8E5EB0` (Rent -- purple)
- `#B05580` (Services -- rose), `#7D6B5D` (Other/fallback -- warm gray)

### MonthlyBarChart.tsx (81 lines)

- Income bars: `#10b981` (green), Expense bars: `#ef4444` (red)
- Grid: `rgba(34, 21, 13, 0.12)`, Tick labels: `#5c4a3e`
- Tooltip: cream background `#fdfaf0` with brown border

### BalanceLine.tsx (94 lines)

- Dual-gradient area chart (green above zero, red below)
- Grid and reference line in translucent brown
- Tooltip styled identically to MonthlyBarChart

### FinanceTab.tsx (384 lines)

- Container/table styling in cream/brown palette

---

## 8. Toaster Configuration

**File:** `frontend/src/main.tsx`

- Position: `top-right`
- Duration: 4000ms
- Background: `#22150d` (dark brown), Text: `#f9f0d9` (cream)
- Success icon: `#22c55e` primary / cream secondary
- Error icon: `#ef4444` primary / cream secondary

---

## 9. Supporting Components Updated

### UnsavedChangesDialog.tsx (58 lines)

- Backdrop with blur and warm brown overlay
- Dialog card in cream palette

### ErrorBoundary.tsx (102 lines)

- Error display in warm palette

### App.tsx (182 lines)

- Loading spinner: `bg-cream-50` background, `border-brown-600` spinner
- Integrates both `useSmoothScroll()` and `useScrollReveal()` at root level
- `ScrollToTop` component for route-change scroll reset

---

## 10. Role Guards (Verified Consistent)

TopNav `roles` array and App.tsx `RoleRoute` guards are aligned:

| Route | TopNav visibility | App.tsx guard |
|-------|-------------------|---------------|
| `/projects` | All authenticated | `ProtectedRoute` only |
| `/projects/:id` | -- | `ProtectedRoute` only |
| `/employees` | Admin, Manager | `['Admin', 'Manager']` |
| `/companies` | Admin, Manager | `['Admin', 'Manager']` |
| `/workload` | All authenticated | `ProtectedRoute` only |
| `/analytics` | Admin, Manager, Trial | `['Admin', 'Manager', 'Trial']` |
| `/expenses` | Admin | `['Admin']` |
| `/smtp-settings` | Admin | `['Admin']` |
| `/profile` | All (user menu) | `ProtectedRoute` only |

---

## 11. Verification

### Legacy Color Audit

| Check | Count |
|-------|-------|
| `bg-white` in .tsx files | **0** |
| `bg-gray-*`, `text-gray-*`, `border-gray-*` in .tsx files | **0** |
| `blue-[0-9]` in .tsx files | **0** |
| `ProjectDB` or `projectdb` in source | **0** |

### New Color Usage

- **798** instances of cream/brown/accent Tailwind classes across frontend source

### Build Status

| Target | Result |
|--------|--------|
| Frontend (`npm run build`) | Passes -- built in 2.35s, 4 chunks |
| Backend (`npm run build` / `nest build`) | Passes -- clean |

### File Inventory

| Metric | Count |
|--------|-------|
| Frontend source files (.tsx + .ts + .css) | **34** (25 .tsx, 8 .ts, 1 .css) |
| Total frontend source lines | **11,848** |
| Pages | **13** |
| Components | **9** |
| Hooks | **3** |
| Email templates | **2** |

---

## 12. Execution Structure

Phase 3 was executed in 4 waves with parallel agent work:

### Wave 1: Foundation (3 agents)

| Agent | Task |
|-------|------|
| **1A -- Foundation** | Tailwind config (color palette, fonts, radius), global CSS (selection, scrollbar, component classes, Lenis base), index.html (title, meta, theme-color), Toaster styling |
| **1B -- Branding** | "ProjectDB" to "LenconDB" rename across 17 files (33 occurrences) |
| **1C -- Dependencies** | Installed `gsap@^3.14.2` and `@studio-freight/lenis@^1.0.42` |

### Wave 2: Layout + Auth (3 agents)

| Agent | Task |
|-------|------|
| **2A -- TopNav** | Created TopNav (451 lines), updated MainLayout (24 lines), deleted Sidebar + Header + BottomNav |
| **2B -- Auth Pages** | LoginPage, AcceptInvitePage, ResetPasswordPage -- dark brown background + cream card |
| **2C -- Dialogs** | UnsavedChangesDialog, ErrorBoundary -- backdrop blur + warm tones |

### Wave 3: All Pages (5 agents)

| Agent | Task |
|-------|------|
| **3A -- Projects** | ProjectsPage (1,029 lines) + ProjectDetailPage (1,014 lines) |
| **3B -- Workload** | WorkloadPage (2,396 lines) -- colors only, zero logic changes |
| **3C -- Analytics** | AnalyticsPage (890 lines) + 4 chart components (646 lines total) |
| **3D -- Data Pages** | ExpensesPage (763 lines) + EmployeesPage (880 lines) + CompaniesPage (587 lines) |
| **3E -- Settings** | ProfilePage (184 lines) + SmtpSettingsPage (409 lines) + NotFoundPage (23 lines) + App.tsx spinner |

### Wave 4: Animations + Email (2 agents)

| Agent | Task |
|-------|------|
| **4A -- Email** | invite.html + reset-password.html -- warm inline CSS |
| **4B -- Animations** | AsciiBackground (737 lines), useSmoothScroll (51 lines), useScrollReveal (55 lines), Lenis CSS integration |

### Post-Wave: Review + Fix

| Agent | Task |
|-------|------|
| **Reviewer 1** | Full code audit -- identified missing AsciiBackground import, dead code in hooks, residual blue classes |
| **Reviewer 2** | Second-pass audit -- verified all fixes, confirmed zero legacy colors |
| **Devil's Advocate** | Challenged design decisions, verified accessibility (prefers-reduced-motion, ARIA, touch targets, skip link) |
| **Fixer** | Applied all fixes from review rounds |

---

## 13. Files Modified/Created/Deleted

### Created (3)

- `frontend/src/components/AsciiBackground.tsx` (737 lines)
- `frontend/src/hooks/useSmoothScroll.ts` (51 lines)
- `frontend/src/hooks/useScrollReveal.ts` (55 lines)

### Replaced (1)

- `frontend/src/components/layout/TopNav.tsx` (451 lines) -- replaces Sidebar + Header + BottomNav

### Deleted (3)

- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/BottomNav.tsx`

### Modified (39)

- `frontend/tailwind.config.js` -- full color palette, fonts, radius, spacing
- `frontend/src/styles/index.css` -- 165 lines of design tokens + global styles
- `frontend/index.html` -- title, meta, theme-color
- `frontend/src/main.tsx` -- Toaster warm styling
- `frontend/src/App.tsx` -- smooth scroll + scroll reveal integration, spinner colors
- `frontend/src/components/layout/MainLayout.tsx` -- TopNav + skip link
- `frontend/src/components/common/UnsavedChangesDialog.tsx` -- warm palette
- `frontend/src/components/ErrorBoundary.tsx` -- warm palette
- `frontend/src/components/analytics/BalanceLine.tsx` -- warm chart styling
- `frontend/src/components/analytics/CategoryPieChart.tsx` -- 11 warm category colors
- `frontend/src/components/analytics/MonthlyBarChart.tsx` -- warm chart styling
- `frontend/src/components/analytics/FinanceTab.tsx` -- warm palette
- All 13 page files in `frontend/src/pages/`
- `backend/src/modules/mail/templates/invite.html` -- warm inline CSS
- `backend/src/modules/mail/templates/reset-password.html` -- warm inline CSS
- Various backend source files (LenconDB branding)

**Total file operations: 46** (39 modified + 3 created + 1 replaced + 3 deleted)
