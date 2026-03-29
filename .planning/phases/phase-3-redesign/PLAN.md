# Phase 3: Complete Visual Redesign (OpenHands.dev Style) — Detailed Plan

**Date:** 2026-03-29

## Scope
- Full color palette swap: blue/gray → cream `#f9f0d9` / brown `#22150d` / yellow `#FFFF8B`
- "ProjectDB" → "LenconDB" branding (33 occurrences across 17 files)
- Typography, border-radius (0.4rem), selection colors, backdrop blur
- Lenis smooth scroll + GSAP
- Email template restyling
- 46 file operations (44 modify, 1 create, 1 npm install)

## Wave 1: Foundation (2 agents parallel)
- **Agent 1A:** Tailwind config (color palette, fonts, radius), global CSS (selection, scrollbar, component classes), index.html (title, meta), Toaster styling
- **Agent 1B:** Branding rename "ProjectDB"→"LenconDB" in all 33 locations (17 files)
- **Agent 1C:** Install gsap + @studio-freight/lenis

## Wave 2: Layout + Auth (3 agents parallel)
- **Agent 2A:** MainLayout, Sidebar, Header, BottomNav — cream/brown palette
- **Agent 2B:** LoginPage, AcceptInvitePage, ResetPasswordPage — dark brown bg + cream card
- **Agent 2C:** UnsavedChangesDialog, ErrorBoundary — backdrop blur + warm tones

## Wave 3: All Pages (5 agents parallel)
- **Agent 3A:** ProjectsPage + ProjectDetailPage
- **Agent 3B:** WorkloadPage (COLORS ONLY, no logic changes — 2396 lines)
- **Agent 3C:** AnalyticsPage + 4 chart components (warm chart palette)
- **Agent 3D:** ExpensesPage + EmployeesPage + CompaniesPage
- **Agent 3E:** ProfilePage + SmtpSettingsPage + NotFoundPage + App.tsx spinner

## Wave 4: Email + Animations (2 agents parallel)
- **Agent 4A:** Email templates (invite.html, reset-password.html) — warm inline CSS
- **Agent 4B:** Lenis smooth scroll hook + GSAP ticker integration + CSS

## Resolved Questions

1. **ASCII art** → ДА, добавить (адаптировать с текстом LENCON DB)
2. **Навигация** → Top nav как OpenHands (переделка sidebar → top nav)
3. **Анимации** → Lenis + ScrollTrigger (smooth scroll + scroll-reveal)
4. **Email шаблоны** → ДА, перекрашиваем сейчас
5. **Sidebar** → Заменяем на top nav (больше работы, но ближе к OpenHands)

## Additional scope from decisions
- ASCII art component (~300 lines) — Wave 4
- Top nav refactor (replace Sidebar → TopNav) — Wave 2
- ScrollTrigger reveal animations — Wave 4
- Email templates — Wave 4
