#!/bin/bash
# Export data from Supabase PostgreSQL
# Usage: SUPABASE_URL="postgresql://..." ./export-from-supabase.sh

set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ]; then
  echo "Error: Set SUPABASE_URL environment variable"
  echo "Example: SUPABASE_URL='postgresql://postgres.xxx:password@host:5432/postgres' $0"
  exit 1
fi

TABLES=(
  users companies projects workload_plan workload_actual
  project_workload_distributions payment_schedules refresh_tokens
  project_users employee_proposals lenconnect_chat_logs
  invite_tokens smtp_configs expenses
)

echo "Exporting ${#TABLES[@]} tables from Supabase..."

pg_dump \
  --data-only \
  --format=custom \
  --no-owner \
  --no-privileges \
  $(for t in "${TABLES[@]}"; do echo "-t $t"; done) \
  "$SUPABASE_URL" \
  -f supabase_export.dump

echo "Export complete: supabase_export.dump ($(du -h supabase_export.dump | cut -f1))"
