# Phase 9: Production Deployment & CI/CD

## Goal
Deploy lencondb3 to production server, replacing projectdb2. Set up CI/CD pipeline and migrate database from Supabase to server-side PostgreSQL.

## Server Info
- IP: 168.222.253.148
- User: lencondb
- SSH key: ~/.ssh/lencondb (ed25519)
- OS: Ubuntu
- Web server: Nginx (already installed)
- Domain: lencondb.ru (SSL via Let's Encrypt, already configured)
- Old project path: /opt/projectdb2

## Changes

### 1. Production Docker Compose
Create `docker-compose.prod.yml` with 3 services:
- **postgres**: PostgreSQL 17 Alpine, persistent volume, port 5432 (internal only)
- **backend**: NestJS app, port 3000, depends on postgres
- **frontend**: Nginx serving Vite build, port 8080, depends on backend

### 2. GitHub Actions CI/CD
Create `.github/workflows/deploy.yml`:
- Trigger: manual (workflow_dispatch)
- Steps: checkout → SSH setup → rsync → create .env → docker compose build/up → health checks
- Based on projectdb2's working deploy.yml but adapted for lencondb3

### 3. GitHub Secrets to Configure
- SSH_PRIVATE_KEY (content of ~/.ssh/lencondb)
- DATABASE_URL (postgresql://lencondb:PROD_PASSWORD@postgres:5432/lencondb)
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- POSTGRES_PASSWORD (for Docker PG)

### 4. Database Migration
- Export from Supabase (pg_dump)
- Import into server PostgreSQL container
- Verify row counts across all tables

### 5. Nginx Update
Update existing nginx config to proxy to new container ports (same as old: backend 3000, frontend 8080)

### 6. Cutover Plan
1. Stop old projectdb2 containers
2. Deploy lencondb3 containers
3. Import database
4. Run Prisma migrations
5. Verify health checks
6. Update nginx if needed

## Files to Create/Modify
- `docker-compose.prod.yml` — production compose
- `.github/workflows/deploy.yml` — CI/CD pipeline
- `.env.production.example` — template for prod env vars
- `scripts/deploy/` — helper scripts if needed
