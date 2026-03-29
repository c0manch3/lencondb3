# LenconDB — Project Overhaul

**Source:** `/Users/agent1/Documents/JOB/projectdb2`
**Target:** `/Users/agent1/Documents/JOB/lencondb3`
**Reference design:** https://openhands.dev/ (teardown: `research/2026-03-28-openhands-teardown.md`)

## Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** NestJS 11 + Prisma ORM
- **Database:** PostgreSQL (local, Docker)
- **Animations:** GSAP + Lenis (smooth scroll)

## Features to REMOVE
- AI module (chat, agents, config, logs, knowledge base)
- Document management (upload, versioning, storage)
- Constructions (buildings/structures in projects)

## Features to KEEP
- Authentication (JWT, roles: Admin/Manager/Employee/Trial)
- Project management (CRUD, statuses, teams, payment schedules)
- Workload (planned + actual, calendar, filters, export)
- Company management (customers/contractors)
- Analytics (charts, visualization)
- Expenses (categories, import/export, filtering)
- Email system (SMTP, invitations)
- User management
- `lenconnect_chat_log` table (used by Telegram bot — keep table, remove UI if any)

## Critical Optimization
- Reduce overfetching — many queries load unnecessary data
- Proper pagination and selective field loading
- Add DB indexes where missing
- Code splitting and lazy loading
