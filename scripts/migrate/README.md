# Data Migration: Supabase to Local PostgreSQL

Two approaches are provided for migrating production data from Supabase to the local PostgreSQL instance.

## Prerequisites

1. Local PostgreSQL is running via Docker Compose:
   ```bash
   docker compose up -d postgres
   ```

2. Prisma migration is applied:
   ```bash
   cd backend && npx prisma migrate dev
   ```

3. You have the Supabase connection string (from Supabase dashboard > Settings > Database).

## Approach A: pg_dump / pg_restore (Recommended)

Fastest and most reliable. Requires `psql` and `pg_dump` CLI tools.

```bash
cd scripts/migrate

# Step 1: Export from Supabase
SUPABASE_URL="postgresql://postgres.xxx:password@host:5432/postgres" \
  ./export-from-supabase.sh

# Step 2: Import into local PG
DATABASE_URL="postgresql://lencondb:lencondb_dev_2026@localhost:5433/lencondb" \
  ./import-to-local.sh

# Step 3: Verify (runs automatically after import, or manually)
DATABASE_URL="postgresql://lencondb:lencondb_dev_2026@localhost:5433/lencondb" \
SUPABASE_URL="postgresql://postgres.xxx:password@host:5432/postgres" \
  ./verify-migration.sh
```

## Approach B: Prisma-based Migration

Use when pg_dump is not available. Slower but works anywhere Node.js runs.

```bash
cd backend

SUPABASE_URL="postgresql://postgres.xxx:password@host:5432/postgres" \
DATABASE_URL="postgresql://lencondb:lencondb_dev_2026@localhost:5433/lencondb" \
  npx ts-node ../scripts/migrate/prisma-migrate.ts
```

**Note:** The target database should be empty (no seed data). If you already seeded, reset first:
```bash
npx prisma migrate reset --skip-seed
```

## Verification

The `verify-migration.sh` script compares row counts across all 14 tables. If `SUPABASE_URL` is set, it compares local vs. Supabase counts. Otherwise it just reports local counts.

## Rollback

To reset the local database and start fresh:
```bash
cd backend && npx prisma migrate reset
```

This drops all tables, re-applies migrations, and runs the seed script.

## Tables Migrated (14)

| # | Table | FK Dependencies |
|---|-------|----------------|
| 1 | users | none |
| 2 | companies | none |
| 3 | smtp_configs | none |
| 4 | projects | users, companies |
| 5 | project_users | users, projects |
| 6 | workload_plan | users, projects |
| 7 | workload_actual | users |
| 8 | project_workload_distributions | workload_actual, projects |
| 9 | payment_schedules | projects |
| 10 | refresh_tokens | users |
| 11 | employee_proposals | users |
| 12 | lenconnect_chat_logs | users |
| 13 | invite_tokens | users |
| 14 | expenses | users |
