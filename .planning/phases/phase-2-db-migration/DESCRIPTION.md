# Phase 2: Database Migration (Supabase → Local PostgreSQL)

## Goal
Replace Supabase with a local PostgreSQL instance in Docker. Migrate schema, create data migration tool, optimize schema.

## Scope

### Docker Setup
- `docker-compose.yml` with PostgreSQL 15 service
- Persistent volume for data
- Health checks
- Environment variables for connection

### Schema Rework (Prisma)
- Remove models: `AiConfig`, `AiQueryLog`, `AiKnowledge`, `AiChatMessage`, `Document`, `Construction`
- Keep `LenconnectChatLog` (Telegram bot dependency)
- Review and add indexes:
  - `workload_plan`: index on `(userId, date)`, `(projectId)`, `(managerId)`
  - `workload_actual`: index on `(userId, date)`
  - `project_workload_distributions`: index on `(workloadActualId)`, `(projectId)`
  - `expenses`: index on `(date)`, `(category)`
- Generate fresh migration

### Data Migration Tool
- Script to export data from Supabase (via REST API or direct PG connection)
- Script to import into local PostgreSQL
- Verify data integrity after migration
- Handle: users, projects, companies, workload_plan, workload_actual, distributions, expenses, payment_schedules, project_users

### Connection Config
- Update `.env` — local PostgreSQL connection string
- Remove Supabase-specific pooler/pgbouncer config
- Update Prisma datasource

## Waves
- **Wave 1:** Docker setup + Schema rework (2 agents parallel)
- **Wave 2:** Migration scripts (export + import) (1 agent)
- **Wave 3:** Integration testing + data verification (1 agent)
