# QA Engineer Memory - ProjectDB Backend

## Project Overview
- Backend: NestJS at localhost:3001 (proxied to 3000)
- Frontend: Vite React at localhost:5173
- AI Chat: streaming endpoint POST /api/ai/chat/stream
- Login: admin@projectdb.com / Admin123!
- Global prefix: /api (set in main.ts)
- ValidationPipe: whitelist=true, forbidNonWhitelisted=true, transform=true

## Architecture Patterns
- Prisma ORM with soft delete (deletedAt field)
- Guards: JwtAuthGuard, AdminGuard, ManagerGuard, NotTrialGuard, ManagerOrTrialGuard
- CurrentUser decorator: reads from request.user
- Document controller uses CurrentUser('sub'), Expense also uses CurrentUser('sub') -- consistent
- Some other modules may use CurrentUser('id') -- verify on case-by-case basis

## Expense Module (Phases 1-7 Complete)
- CRUD: expense.service.ts, IO: expense-io.service.ts
- Analytics: finance-analytics.service.ts (4 endpoints)
- Frontend: ExpensesPage.tsx, FinanceTab.tsx, 3 Recharts components
- 12 categories (enum ExpenseCategory)
- Financial amounts stored as Float (not Decimal) -- tech debt
- See: project_expense_final_review.md for full Phases 1-7 review
- Final review document: plan/IMPLEMENTATION_REVIEW.md (2026-03-12)

## AI Chat Architecture
- Intent classification in coordinator.agent.ts
- Priority: greeting > contextual_reference_followup > db_query > followup > consulting
- Query/Schema/Pipeline agents in src/modules/ai/services/agents/

## Retest Results (2026-02-18)
- All 4 AI chat scenarios PASS after enriched queryMeta context fix
- Resolved issues in .planning/debug/resolved/

## Common Security Patterns to Check
- FileInterceptor without fileFilter (CWE-434)
- Missing try/catch around file parsing (CWE-209)
- Unbounded DB queries without take/limit (OOM risk)
- Timezone issues with Date operations on financial data
