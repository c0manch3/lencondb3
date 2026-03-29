# Phase 6: Complete Frontend Rebuild — Plan

**Date:** 2026-03-29

## Decisions
- **Framework:** React + Vite
- **UI:** Tailwind from scratch
- **Data fetching:** TanStack Query v5
- **Tables:** TanStack Table v8
- **Charts:** Chart.js + react-chartjs-2
- **Calendar:** Custom (Monday start, ISO)
- **Architecture:** Feature-based folders
- **Forms:** react-hook-form + zod (ALL forms)
- **GSAP/Lenis:** Keep (smooth scroll + scroll reveal)
- **Mobile tables:** Card layout (not scroll)
- **ASCII background:** ALL pages (not just login)
- **Design:** Warm OpenHands palette (cream/brown/yellow)

## Scope
- DELETE all source in `frontend/src/` (except i18n, styles)
- REBUILD ~78 new files
- 100% feature parity with FUNCTIONAL_SPEC.md

## Waves (3 waves, optimized for parallelism)

### Wave 1: Foundation (3 agents parallel) + Prep
One agent does prep (config, deps, delete old code), then 3 foundation agents run parallel:
- A: App shell + Auth + API client + types + routes (8 files)
- B: Shared UI primitives — Button, Input, Select, Modal, ConfirmDialog, Badge, Pagination, Spinner, EmptyState, Skeleton, ErrorBoundary, DatePicker (12 files)
- C: Layout + TopNav + AsciiBackground + Table wrapper + useSmoothScroll + useScrollReveal + useUnsavedChanges + useOverdueBadge (8 files)

### Wave 2: Simple pages (4 agents parallel)
- D: Auth pages — Login, AcceptInvite, ResetPassword (3 files)
- E: Companies — CompaniesPage + CompanyForm + hooks (4 files)
- F: Employees — EmployeesPage + EmployeeForm + hooks (4 files)
- G: Profile + SmtpSettings + NotFound (3 files)

### Wave 3: Complex pages (4 agents parallel)
- H: Projects — ProjectsPage + ProjectDetailPage + 4 tabs + ProjectForm + hooks (8 files)
- I: Workload — WorkloadPage + 3 views + 6 modals + 3 hooks + types (16 files)
- J: Analytics — AnalyticsPage + 3 tabs + 3 Chart.js charts + hooks (8 files)
- K: Expenses — ExpensesPage + form + OverdueBanner + hooks (4 files)

Then: code-reviewer + devil's advocate

## Specs
- FUNCTIONAL_SPEC.md — 1447 lines, every feature
- UI_COMPONENTS_SPEC.md — OpenHands design reference
- TABLE_DESIGN.md — 1502 lines, all table/badge designs
