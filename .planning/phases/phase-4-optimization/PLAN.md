# Phase 4: Performance Optimization — Detailed Plan

**Date:** 2026-03-29

## Critical Issues Found

### Backend (ordered by severity)
1. **analytics.service.ts getProjectsWorkload()** — loads ALL projects with ALL relations unbounded, includes passwordHash
2. **analytics.service.ts getEmployeeWorkHours()** — loads full Users + all actuals when only SUM needed
3. **project.service.ts findOne()** — returns full Company with bank details
4. **7 services without pagination** — workload-plan, workload-actual, company, payment-schedule, chat-log, project, users
5. **passwordHash leaking** via findUnique without select in users.service.ts

### Frontend
1. **No lazy loading** — all 13 pages eagerly imported
2. **jsPDF (300KB) + xlsx (400KB)** statically imported, used only on export
3. **Redux Toolkit + TanStack Query** — both shipped, barely used
4. **No Vite code splitting** — 1.9MB single chunk
5. **GSAP/Lenis** loading on every page including login

## Waves

### Wave 1: Backend Query Optimization (2 agents parallel)
- Agent A: Analytics rewrite (getProjectsWorkload → aggregates, getEmployeeWorkHours → groupBy)
- Agent B: All other services (pagination, select narrowing, passwordHash security)

### Wave 2: Frontend Bundle (1 agent)
- React.lazy for all routes
- Dynamic import jsPDF/xlsx
- Vite manualChunks
- Remove Redux Toolkit → React Context
- Remove TanStack Query (unused)

### Wave 3: React Performance (1 agent)
- Move GSAP/Lenis to MainLayout (not App)
- React.memo for list components

### Wave 4: Network + Final (1 agent)
- Response compression
- Prisma query logging (dev)
- Bundle analysis

## Open Questions — see interactive discussion
