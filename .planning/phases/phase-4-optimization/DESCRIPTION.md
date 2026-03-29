# Phase 4: Performance Optimization

## Goal
Dramatically reduce load times, eliminate overfetching, optimize bundle size, and ensure snappy UX.

## CRITICAL: Query Optimization
This is the #1 priority. The app currently loads too much unnecessary data.

### Backend Query Audit
- Audit EVERY Prisma query for overfetching:
  - Use `select` instead of returning full models
  - Use `include` only where relations are needed
  - Add proper `where` clauses to limit data
- Workload queries: load only visible date range, not all data
- Project list: return summary fields, not full project with all relations
- Employee lists: return only needed fields (id, name, role)
- Add pagination where missing (especially workload calendar view)

### Database Indexes
- Verify all indexes from Phase 2 are effective
- Add composite indexes for common query patterns
- Analyze slow queries with `EXPLAIN ANALYZE`

### Frontend Optimization
- **Code splitting:** Lazy load routes with `React.lazy()` + `Suspense`
- **State management cleanup:** Choose ONE approach:
  - Remove Redux Toolkit (only used for auth) → move to Zustand or context
  - OR remove Zustand → consolidate on Redux
  - Keep TanStack Query for server state
- **Bundle reduction:**
  - Remove unused dependencies
  - Dynamic import for heavy libs (jsPDF, xlsx) — only load on export
  - Tree-shake Recharts (import specific components)
  - Evaluate Framer Motion necessity (may replace with CSS + GSAP)
- **React optimizations:**
  - `React.memo` for expensive components
  - `useMemo`/`useCallback` where re-renders are costly
  - Virtual scrolling for long lists if needed

### Network Optimization
- API response compression (gzip)
- Cache headers for static assets
- Prefetch critical data on route navigation

## Waves
- **Wave 1:** Backend query audit + optimization (2 agents parallel — workload queries + all other queries)
- **Wave 2:** Frontend bundle optimization + code splitting (1 agent)
- **Wave 3:** State management consolidation + React performance (1 agent)
- **Wave 4:** Network + caching + final benchmarks (1 agent)
