#!/bin/bash
set -euo pipefail

echo "=== LenconDB3 First Deployment ==="
echo "This script stops projectdb2 and starts lencondb3"
echo ""

# 1. Stop old project
echo "[1/6] Stopping projectdb2..."
if [ -d /opt/projectdb2 ]; then
  cd /opt/projectdb2
  sudo docker compose down --remove-orphans || echo "Warning: failed to stop projectdb2"
  cd /opt/lencondb3
else
  echo "projectdb2 not found, skipping"
fi

# 2. Start PostgreSQL
echo "[2/6] Starting PostgreSQL..."
cd /opt/lencondb3
sudo docker compose -f docker-compose.prod.yml up -d postgres
echo "Waiting for PostgreSQL to be healthy..."
sleep 8

# 3. Run migrations
echo "[3/6] Running Prisma migrations..."
sudo docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# 4. Import data if dump exists
if [ -f /opt/lencondb3/supabase_export.dump ]; then
  echo "[4/6] Importing Supabase data..."
  sudo docker cp /opt/lencondb3/supabase_export.dump lencondb-postgres:/tmp/supabase_export.dump
  sudo docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_restore --data-only --disable-triggers --no-owner --no-privileges \
    -U lencondb -d lencondb /tmp/supabase_export.dump
  sudo docker compose -f docker-compose.prod.yml exec -T postgres \
    rm /tmp/supabase_export.dump
  echo "Import complete."
else
  echo "[4/6] No supabase_export.dump found, skipping import."
fi

# 5. Start all services
echo "[5/6] Starting all services..."
sudo docker compose -f docker-compose.prod.yml up -d
sleep 10

# 6. Health check
echo "[6/6] Health checks..."
sudo docker compose -f docker-compose.prod.yml ps
echo ""
curl -s -o /dev/null -w "Backend: HTTP %{http_code}\n" http://localhost:3000/api/company || true
curl -s -o /dev/null -w "Frontend: HTTP %{http_code}\n" http://localhost:8080 || true
echo ""
echo "=== Done! Visit https://lencondb.ru ==="
