# Phase 2: Database Migration & WorkloadPlan Multi-Project -- COMPLETED

**Date completed:** 2026-03-28
**Project:** LenconDB
**Stack:** NestJS 11 (backend) + React 18/Vite (frontend) + Prisma ORM + PostgreSQL 17 (Docker)

---

## What Was Done

### 1. Docker PostgreSQL Setup

- Created `docker-compose.yml` with PostgreSQL 17 Alpine image
- Container `lencondb-postgres` with health checks (`pg_isready`), `shm_size: 256mb`, restart policy `unless-stopped`
- Mapped to host port 5433 (configurable via `POSTGRES_PORT`)
- Persistent volume `postgres_data` for data durability
- All credentials driven by environment variables (no hardcoded secrets)

### 2. Environment Configuration

- Created `.env.example` (root) -- PostgreSQL credentials, DATABASE_URL, JWT secrets, ENCRYPTION_MASTER_KEY, CORS_ORIGINS, SMTP placeholders
- Created `backend/.env.example` -- DATABASE_URL and server config
- CORS moved from hardcoded IPs (`45.131.42.199`, `lencondb.ru`) to environment variables (`CORS_ORIGINS`, `FRONTEND_URL`) with comma-separated origin support

### 3. Schema Rework (Prisma)

| Change | Detail |
|--------|--------|
| **Removed `directUrl`** | Was for Supabase pgbouncer connection pooling -- not needed with local PostgreSQL |
| **pgcrypto extension** | Moved `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` from runtime code (`mail.service.ts`) into Prisma schema (`extensions = [pgcrypto]`) and baseline migration SQL |
| **14 indexes added** | See "Database Indexes" table below |
| **WorkloadPlan unique constraint** | Changed from `@@unique([userId, date])` to `@@unique([userId, date, projectId])` -- enables multi-project workload plans per employee per day |
| **WorkloadPlan `hours` column** | Added `hours Float?` -- optional hours field for planned workload entries |
| **SmtpConfig `fromName` default** | Updated from `"ProjectDB"` to `"LenconDB"` |
| **Schema comment** | Updated to `"Prisma schema for LenconDB - PostgreSQL (local Docker)"` |

### 4. Baseline Migration

- Created `20260328132821_init` -- single baseline migration encompassing the entire schema
- Migration includes: 10 enums, 15 tables (14 models + `_prisma_migrations`), all indexes, pgcrypto extension, all constraints
- Status: **Applied and up to date**

### 5. Migration Scripts

Created `scripts/migrate/` directory with two migration approaches:

| Script | Purpose |
|--------|---------|
| `export-from-supabase.sh` | pg_dump export from Supabase (Approach A) |
| `import-to-local.sh` | pg_restore into local PostgreSQL |
| `verify-migration.sh` | Row count verification across all 14 tables (local vs. Supabase comparison) |
| `prisma-migrate.ts` | Node.js/Prisma-based migration (Approach B) -- for when pg_dump is unavailable |
| `README.md` | Step-by-step documentation for both approaches, prerequisites, rollback procedure, FK dependency order |

### 6. WorkloadPlan Multi-Project Support

#### Backend

| File | Changes |
|------|---------|
| `workload-plan.dto.ts` | Created `CreateWorkloadPlanDto` (userId, projectId, date, hours?) and `UpdateWorkloadPlanDto` (projectId?, date?, hours?) with full validation -- UUID regex, `@IsDateString`, `@Min(0)/@Max(24)` for hours |
| `workload-plan.service.ts` | Conflict check updated from `userId_date` to `userId_date_projectId` compound unique lookup; update conflict check considers `data.projectId \|\| plan.projectId` for date+project changes |
| `workload-plan.controller.ts` | Date parameter validation (`isNaN(new Date().getTime())`) on `findAll` and `getCalendarView` endpoints; uses DTO classes for create/update |

#### Frontend (`WorkloadPage.tsx`)

- Removed "filter out busy employees" logic -- employees can now have multiple plans per day (one per project)
- Add Plan modal: pre-selects project from filter; sends `projectId` and optional `hours` in API call
- Edit Plan modal: allows changing project and hours
- Calendar cells: display project-specific plan entries with hours
- Export modal: full export with employee/date range/format selection (CSV, XLSX, PDF)
- Actual hours logging: distributions with per-project hours and descriptions

### 7. Cleanup

| Item | Detail |
|------|--------|
| **Deleted empty WorkloadModule** | `backend/src/modules/workload/` -- had 0 controllers, 0 providers, 0 services; module registration removed from `app.module.ts` |
| **Removed `dayjs` dependency** | Listed in `backend/package.json` but never imported anywhere in source code |
| **Added `frontend/dist/` to `.gitignore`** | Build output directory was being tracked (deferred from Phase 1) |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| **PostgreSQL version** | 17.9 (Alpine) |
| **Docker container status** | Up and healthy |
| **Prisma migration status** | 1 migration applied, schema up to date |
| **Tables** | 15 (14 models + `_prisma_migrations`) |
| **Indexes** | 40 total (14 new custom + PKs + unique constraints) |
| **pgcrypto extension** | Installed, version 1.3 |
| **WorkloadPlan unique constraint** | `workload_plan_userId_date_projectId_key` (verified) |
| **WorkloadPlan `hours` column** | `double precision`, nullable (verified) |
| **Backend build** | PASS (`nest build` -- no errors) |
| **Frontend build** | PASS (`vite build` in 2.27s -- chunk size warning only) |
| **WorkloadPage.tsx** | 2,396 lines |
| **Backend modules** | 12 remaining (workload empty module deleted) |
| **Migration scripts** | 5 files (3 shell + 1 TypeScript + 1 README) |

### Seed Data (Row Counts)

| Table | Rows |
|-------|------|
| `_prisma_migrations` | 1 |
| `companies` | 2 |
| `lenconnect_chat_logs` | 4 |
| `projects` | 1 |
| `users` | 4 |
| `employee_proposals` | 0 |
| `expenses` | 0 |
| `invite_tokens` | 0 |
| `payment_schedules` | 0 |
| `project_users` | 0 |
| `project_workload_distributions` | 0 |
| `refresh_tokens` | 0 |
| `smtp_configs` | 0 |
| `workload_actual` | 0 |
| `workload_plan` | 0 |

### Database Indexes (14 Custom + System)

| Table | Index | Type |
|-------|-------|------|
| `workload_plan` | `projectId` | B-tree |
| `workload_plan` | `managerId` | B-tree |
| `workload_plan` | `date` | B-tree |
| `workload_actual` | `userId` | B-tree |
| `workload_actual` | `date` | B-tree |
| `project_workload_distributions` | `workloadActualId` | B-tree |
| `project_workload_distributions` | `projectId` | B-tree |
| `payment_schedules` | `projectId` | B-tree |
| `payment_schedules` | `isPaid, expectedDate` | Composite B-tree |
| `refresh_tokens` | `userId` | B-tree |
| `projects` | `managerId` | B-tree |
| `projects` | `customerId` | B-tree |
| `projects` | `status` | B-tree |
| `lenconnect_chat_logs` | `user_id` | B-tree |
| `expenses` | `date` | B-tree |
| `expenses` | `category` | B-tree |
| `expenses` | `deletedAt` | B-tree |
| `invite_tokens` | `tokenHash` | B-tree |
| `invite_tokens` | `userId, type` | Composite B-tree |

---

## Issues Found and Resolved

### Code Review Round 1 (reviewer-phase2)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | **CRITICAL** | `directUrl` still present in `schema.prisma` datasource block | Removed -- datasource now has only `provider`, `url`, and `extensions` |
| 2 | **CRITICAL** | pgcrypto `CREATE EXTENSION` still called at runtime in `mail.service.ts` | Moved to Prisma schema `extensions = [pgcrypto]` and baseline migration SQL; runtime call removed |
| 3 | **HIGH** | `WorkloadModule` (empty) still registered in `app.module.ts` | Module directory deleted, import removed from `app.module.ts` |
| 4 | **HIGH** | WorkloadPlan service still using `userId_date` unique lookup instead of `userId_date_projectId` | Updated to `userId_date_projectId` compound unique in both `create()` and `update()` methods |
| 5 | **HIGH** | No input validation on WorkloadPlan DTOs -- raw strings passed to Prisma | Created `CreateWorkloadPlanDto` and `UpdateWorkloadPlanDto` with `class-validator` decorators (UUID regex, `@IsDateString`, `@Min`/`@Max` for hours) |
| 6 | **MEDIUM** | CORS origins still hardcoded in `main.ts` | Replaced with `process.env.CORS_ORIGINS` / `process.env.FRONTEND_URL` with comma-separated parsing |
| 7 | **MEDIUM** | `SmtpConfig.fromName` default still `"ProjectDB"` | Updated to `"LenconDB"` in Prisma schema |
| 8 | **MEDIUM** | `dayjs` listed as dependency but unused | Removed from `backend/package.json` |
| 9 | **LOW** | `frontend/dist/` not in `.gitignore` | Added to `.gitignore` |

### Code Review Round 2 (devils-advocate-phase2)

| Verdict | Detail |
|---------|--------|
| **APPROVED** | All 9 issues from Round 1 confirmed resolved by fixer-phase2 agent. No new critical or high issues found. |
| **Deferred items** | 4 items documented with justification and assigned to future phases (see below). |

---

## Files Created

| File | Purpose |
|------|---------|
| `docker-compose.yml` | PostgreSQL 17 service definition |
| `.env.example` | Root environment template (DB, JWT, CORS, SMTP) |
| `backend/.env.example` | Backend environment template |
| `backend/prisma/migrations/20260328132821_init/migration.sql` | Baseline migration (full schema) |
| `backend/src/modules/workload-plan/dto/workload-plan.dto.ts` | Create/Update DTOs with validation |
| `scripts/migrate/export-from-supabase.sh` | pg_dump export script |
| `scripts/migrate/import-to-local.sh` | pg_restore import script |
| `scripts/migrate/verify-migration.sh` | Row count verification script |
| `scripts/migrate/prisma-migrate.ts` | Prisma-based migration alternative |
| `scripts/migrate/README.md` | Migration procedure documentation |

## Files Modified

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Removed `directUrl`, added `extensions = [pgcrypto]`, added 14+ indexes, updated `WorkloadPlan` unique constraint and `hours` field, updated `SmtpConfig.fromName` default, updated header comment |
| `backend/src/main.ts` | CORS origins moved to environment variables |
| `backend/src/modules/workload-plan/workload-plan.service.ts` | Conflict checks updated to `userId_date_projectId`, `hours` field support |
| `backend/src/modules/workload-plan/workload-plan.controller.ts` | Date parameter validation, DTO integration |
| `backend/src/app.module.ts` | Removed `WorkloadModule` import and registration |
| `backend/package.json` | Removed `dayjs` dependency |
| `frontend/src/pages/WorkloadPage.tsx` | Multi-project plan support (add/edit modals, calendar display, export, removed busy-employee filter) |
| `.gitignore` | Added `frontend/dist/` |

## Files Deleted

| File | Reason |
|------|--------|
| `backend/src/modules/workload/` (entire directory) | Empty module -- 0 controllers, 0 providers, 0 services |

---

## Remaining Items (Deferred)

| Item | Severity | Deferred To | Details |
|------|----------|-------------|---------|
| "ProjectDB" branding throughout codebase | MEDIUM | Phase 3 | 30+ files still reference "ProjectDB" (`package.json` names, `seed.ts` email domains, `index.html` title/meta, email templates) |
| Production data migration from Supabase | MEDIUM | Pre-production | Scripts ready (both pg_dump and Prisma approaches); pending Supabase pg_dump access verification |
| Query optimization (analytics overfetching, pagination) | HIGH | Phase 4 | `analytics.service.ts` loads ALL projects with ALL relations; most `findAll()` methods lack pagination; passwordHash leaks via manager relation |
| `WorkloadPage.tsx` refactoring (2,396 lines) | MEDIUM | Phase 5 | Monolithic component with 60+ state variables; planned split into 10+ focused components with custom hooks |

---

## Execution Structure

### Waves

| Wave | Focus | Agents | Outcome |
|------|-------|--------|---------|
| Wave 1 | Docker + Schema rework | 2 parallel (docker-agent, schema-agent) | `docker-compose.yml`, schema changes, env files, `.gitignore` update |
| Wave 2 | Migration baseline + scripts | 1 (migration-agent) | Baseline migration, 4 migration scripts, README |
| Wave 3 | WorkloadPlan multi-project | 2 parallel (workload-backend, workload-frontend) | DTO, service/controller updates, frontend modals/calendar/export |
| Wave 4 | Review + Fix | 3 sequential (reviewer-phase2, devils-advocate-phase2, fixer-phase2) | 9 issues found and resolved across 2 review rounds |

### Team Roles

| Role | Agent | Responsibility |
|------|-------|---------------|
| **docker-agent** | Wave 1A | Docker Compose setup, environment templates |
| **schema-agent** | Wave 1B | Prisma schema rework (indexes, directUrl removal, pgcrypto, WorkloadPlan constraint, SmtpConfig default) |
| **migration-agent** | Wave 2 | Baseline migration, export/import/verify scripts, migration README |
| **workload-backend** | Wave 3A | WorkloadPlan DTO, service conflict logic, controller validation |
| **workload-frontend** | Wave 3B | Multi-project modals, calendar display, export, removed busy-employee filter |
| **reviewer-phase2** | Wave 4 | Code review -- surfaced 9 issues across all severity levels |
| **devils-advocate-phase2** | Wave 4 | Second review round -- confirmed all fixes, documented deferred items |
| **fixer-phase2** | Wave 4 | Resolved all 9 issues from code review |

---

## Verification

| Check | Result |
|-------|--------|
| **Docker container** | UP and healthy (port 5433) |
| **PostgreSQL version** | 17.9 (Alpine) |
| **Prisma migrate status** | 1 migration applied, schema up to date |
| **pgcrypto extension** | Installed (v1.3) |
| **Table count** | 15 (14 models + `_prisma_migrations`) |
| **Index count** | 40 total |
| **WorkloadPlan constraint** | `workload_plan_userId_date_projectId_key` (UNIQUE) confirmed |
| **WorkloadPlan `hours` column** | `double precision`, nullable -- confirmed |
| **Seed data** | 4 users, 2 companies, 1 project, 4 chat logs loaded |
| **Backend build** (`npm run build`) | PASS -- `nest build` no errors |
| **Frontend build** (`npm run build`) | PASS -- `vite build` 2.27s (chunk size warning only) |
| **`directUrl` removed** | Confirmed -- not in schema datasource block |
| **`dayjs` removed** | Confirmed -- not in `backend/package.json` |
| **`WorkloadModule` deleted** | Confirmed -- directory does not exist, no references in source |
| **CORS env-driven** | Confirmed -- `CORS_ORIGINS` / `FRONTEND_URL` in `main.ts` |
| **Code review verdict** | APPROVED |
| **Devil's advocate verdict** | APPROVED |

---

## Summary

Phase 2 migrated the LenconDB database layer from Supabase to a local Docker PostgreSQL 17 instance. The work included: Docker Compose setup with health checks and persistent volumes; Prisma schema rework removing Supabase-specific configuration (`directUrl`), adding 14+ performance indexes, and moving pgcrypto extension management from runtime to migration SQL; creation of a baseline migration capturing the full schema; two data migration approaches (pg_dump and Prisma-based) with verification scripts; WorkloadPlan multi-project support (unique constraint changed from `userId+date` to `userId+date+projectId`, `hours` field added, DTOs with validation, frontend modals and calendar updated); and cleanup of the empty WorkloadModule, unused `dayjs` dependency, and CORS hardcoding. Two rounds of code review surfaced 9 issues (2 critical, 3 high, 3 medium, 1 low), all resolved by the fixer agent. Both backend and frontend build cleanly. Four items are deferred to later phases: ProjectDB branding (Phase 3), query optimization (Phase 4), WorkloadPage refactoring (Phase 5), and production Supabase data migration (pre-production).
