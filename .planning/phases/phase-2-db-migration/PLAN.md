# Phase 2: Database Migration (Supabase → Local PostgreSQL) — Detailed Plan

**Date:** 2026-03-28

## Current State

- **14 models**, 10 enums in Prisma schema
- **Zero Supabase SDK usage** — only Prisma ORM, no @supabase imports
- **Raw SQL only in mail.service.ts** — pgcrypto extension (CREATE EXTENSION, pgp_sym_encrypt/decrypt)
- **No migration files** — project used `prisma db push`
- **directUrl** in schema for Supabase pgbouncer — not needed locally
- **Only expense.service.ts has pagination** — all other findAll() load ALL records unbounded

## WorkloadPlan Schema Change (included in Phase 2)

**Change:** `@@unique([userId, date])` → `@@unique([userId, date, projectId])` + add `hours Float?`
**Approach:** Flat rows (Approach A) — minimal changes, zero data loss, can evolve to distributions later.
**Backend:** Update create/update conflict checks from `userId_date` to `userId_date_projectId`, accept `hours` in DTO.
**Frontend:** Remove "filter out busy employees" logic, allow adding multiple plans per employee per day, show hours in calendar cells.
**Migration:** ALTER TABLE drop old constraint, add new one, add hours column.

## Missing Indexes (14 needed)

| Model | Column(s) | Reason |
|-------|-----------|--------|
| WorkloadPlan | projectId | Filtered in findAll, getCalendarView |
| WorkloadPlan | managerId | Auth checks in update/delete |
| WorkloadPlan | date | Every calendar query |
| WorkloadActual | userId | findAll, getMyWorkload, cascade delete |
| WorkloadActual | date | Date range filter in getEmployeeWorkHours |
| ProjectWorkloadDistribution | workloadActualId | Cascade deletes, aggregation |
| ProjectWorkloadDistribution | projectId | getProjectEmployeeWorkload |
| PaymentSchedule | projectId | findAll by project |
| PaymentSchedule | isPaid, expectedDate | getOverdueSummary composite query |
| RefreshToken | userId | Token refresh, cascade delete |
| Project | managerId | Manager role filter in findAll |
| Project | customerId | FK lookup |
| Project | status | Analytics filter |
| LenconnectChatLog | userId | findByUser queries |

## Query Overfetching Audit

### CRITICAL: analytics.service.ts getProjectsWorkload()
Loads ALL projects with ALL relations (customer, manager, workloadPlans, distributions, projectUsers) — unbounded, includes passwordHash in manager.

### HIGH: analytics.service.ts getEmployeeWorkHours()
Loads full User objects + all workloadActuals when only SUM(hoursWorked) needed.

### HIGH: project.service.ts findOne()
Returns full Company object (bank details, BIK, etc.) when only name/type needed.

### MEDIUM: No pagination in workload-plan, workload-actual, company, payment-schedule, lenconnect-chat-log findAll()

## Execution Waves

### Wave 1: Docker + Schema (2 agents parallel)
- **Agent A:** docker-compose.yml, .env.example, .gitignore fix
- **Agent B:** Schema rework (remove directUrl, add 14 indexes, update comments), remove dayjs, update CORS

### Wave 2: Migration Baseline + Scripts (1 agent)
- Start local PG, create baseline migration, test seed
- Create export/import/verify scripts
- Document migration procedure

### Wave 3: Verification (1 agent)
- Execute migration (if production data needed)
- Test pgcrypto, all API endpoints
- Full build verification

## Files to Create
- `docker-compose.yml`
- `.env.example`, `backend/.env.example`
- `scripts/migrate/export-from-supabase.sh`
- `scripts/migrate/import-to-local.sh`
- `scripts/migrate/verify-migration.sh`
- `scripts/migrate/prisma-migrate.ts`
- `scripts/migrate/README.md`

## Files to Modify
- `backend/prisma/schema.prisma` — remove directUrl, add indexes, update comment
- `backend/src/main.ts` — CORS to env var
- `backend/src/modules/mail/mail.service.ts` — update comment
- `backend/package.json` — remove dayjs
- `.gitignore` — add frontend/dist/

## Resolved Questions

1. **Данные** → Мигрировать production данные из Supabase
2. **Docker** → Только PostgreSQL в Docker, backend/frontend на хосте
3. **Запросы** → Индексы сейчас (Phase 2), перезапись запросов в Phase 4
4. **PG версия** → PostgreSQL 17
5. **pg_dump** → Не уверен, готовим оба варианта (pg_dump + Prisma-скрипт)
6. **WorkloadModule** → Удалить (пустой модуль, 0 controllers/providers)
7. **pgcrypto** → Вынести CREATE EXTENSION из кода в SQL-миграцию
8. **SmtpConfig default** → Обновить "ProjectDB" → "LenconDB" сейчас
9. **frontend/dist/** → Добавить в .gitignore
10. **dayjs** → Удалить (неиспользуемая зависимость)
