# Phase 5: Workload/Calendar Polish & Refactoring

## Goal
Refactor the monolithic WorkloadPage (2,347 lines) into maintainable components while preserving ALL functionality 1:1.

## Architecture Refactoring

### Split into Components
```
components/workload/
├── WorkloadCalendar.tsx          — Calendar grid (month/week/day views)
├── WorkloadFilters.tsx           — Project + Employee filter dropdowns
├── WorkloadToolbar.tsx           — View toggle, navigation, today/week buttons
├── modals/
│   ├── AddPlanModal.tsx          — Create planned workload
│   ├── EditPlanModal.tsx         — Edit plan (project only)
│   ├── LogActualModal.tsx        — Log hours + distributions
│   ├── ViewActualModal.tsx       — Read-only actual report
│   ├── DateEmployeesModal.tsx    — All employees on a date
│   └── ExportModal.tsx           — Export with format selection
├── views/
│   ├── MonthView.tsx             — Month calendar grid
│   ├── WeekView.tsx              — Week calendar grid
│   └── DayView.tsx               — Day detail view
└── hooks/
    ├── useWorkloadData.ts        — Data fetching + caching (TanStack Query)
    ├── useWorkloadFilters.ts     — Filter state management
    ├── useCalendarNavigation.ts  — Date navigation + responsive view switching
    └── useWorkloadExport.ts      — Export logic (CSV/XLSX/PDF)
```

### State Management
- Move from 60+ local state variables to custom hooks
- Use TanStack Query for server state (auto-caching, background refetch)
- Use Zustand for UI state (view mode, selected dates, modal visibility)

### Query Optimization (workload-specific)
- Calendar view: fetch only visible range + 1 week buffer
- Lazy load distributions (only when viewing actual report)
- Debounce filter changes
- Cache calendar data per month

### Preserve ALL Features
- All 5 modals with exact same behavior
- Role-based visibility (Employee sees only own, Manager sees team)
- Touch swipe navigation
- Responsive auto-view switching
- Export in all 3 formats
- Color coding (blue=planned, green=actual)
- Authorization checks (canModifyPlan logic)

## Waves
- **Wave 1:** Create hooks (useWorkloadData, useWorkloadFilters, useCalendarNavigation) (1 agent)
- **Wave 2:** Extract view components (MonthView, WeekView, DayView) + toolbar/filters (3 agents parallel)
- **Wave 3:** Extract modals (6 modals — 2 agents parallel, 3 each)
- **Wave 4:** Integration + regression testing (1 agent)
