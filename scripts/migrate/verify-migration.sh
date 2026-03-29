#!/bin/bash
# Verify migration by comparing row counts
# Usage: DATABASE_URL="postgresql://..." SUPABASE_URL="postgresql://..." ./verify-migration.sh

set -euo pipefail

DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL}"

TABLES=(
  users companies projects workload_plan workload_actual
  project_workload_distributions payment_schedules refresh_tokens
  project_users employee_proposals lenconnect_chat_logs
  invite_tokens smtp_configs expenses
)

echo "=== Migration Verification ==="
echo ""

TOTAL=0
for table in "${TABLES[@]}"; do
  count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM $table" 2>/dev/null | tr -d ' ')
  TOTAL=$((TOTAL + count))

  if [ -n "${SUPABASE_URL:-}" ]; then
    src_count=$(psql "$SUPABASE_URL" -t -c "SELECT count(*) FROM $table" 2>/dev/null | tr -d ' ')
    if [ "$count" = "$src_count" ]; then
      echo "[OK] $table: $count rows (match)"
    else
      echo "[MISMATCH] $table: local=$count, supabase=$src_count"
    fi
  else
    echo "  $table: $count rows"
  fi
done

echo ""
echo "Total rows in local DB: $TOTAL"
echo "=== Done ==="
