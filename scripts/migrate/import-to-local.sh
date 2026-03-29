#!/bin/bash
# Import data into local PostgreSQL
# Usage: DATABASE_URL="postgresql://..." ./import-to-local.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: Set DATABASE_URL environment variable"
  exit 1
fi

DUMP_FILE="${1:-supabase_export.dump}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: Dump file '$DUMP_FILE' not found"
  echo "Run export-from-supabase.sh first"
  exit 1
fi

echo "Importing from $DUMP_FILE..."

pg_restore \
  --data-only \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  -d "$DATABASE_URL" \
  "$DUMP_FILE"

echo "Import complete. Verifying..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/verify-migration.sh"
