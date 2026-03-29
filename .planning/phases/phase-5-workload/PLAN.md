# Phase 5: Workload/Calendar Refactoring — Detailed Plan

**Date:** 2026-03-29

## Current: 2396 lines → Target: ~15 files, orchestrator ~120 lines

## Architecture

```
components/workload/
├── types.ts                      ~50 lines   — Shared interfaces
├── WorkloadToolbar.tsx           ~120 lines  — Nav, view toggle, today/week btns
├── WorkloadFilters.tsx           ~60 lines   — Project + Employee dropdowns
├── views/
│   ├── MonthView.tsx             ~280 lines
│   ├── WeekView.tsx              ~180 lines
│   └── DayView.tsx               ~140 lines
├── modals/
│   ├── AddPlanModal.tsx          ~130 lines
│   ├── EditPlanModal.tsx         ~100 lines
│   ├── LogActualModal.tsx        ~170 lines
│   ├── ViewActualModal.tsx       ~90 lines
│   ├── DateEmployeesModal.tsx    ~180 lines
│   └── ExportModal.tsx           ~120 lines
└── hooks/
    ├── useWorkloadData.ts        ~200 lines  — Fetch + caching + derived getters
    ├── useWorkloadFilters.ts     ~30 lines   — Filter state
    ├── useCalendarNavigation.ts  ~120 lines  — Nav + responsive + touch + memos
    └── useWorkloadExport.ts      ~230 lines  — CSV/XLSX/PDF generation
```

## Design Decisions
- **No Zustand/Context** — plain React hooks (consistent with Phase 4 cleanup)
- **Props-based** — views receive data from hooks via orchestrator
- **Modal-local state** — each modal owns its own form state
- **Date utils** extracted to shared utils.ts

## Waves

### Wave 1: Create hooks (1 agent)
- types.ts, useWorkloadFilters.ts, useCalendarNavigation.ts, useWorkloadData.ts, useWorkloadExport.ts
- Bridge: import hooks into WorkloadPage, verify still works

### Wave 2: Extract views + toolbar (3 agents parallel)
- Agent 2A: WorkloadToolbar + WorkloadFilters
- Agent 2B: MonthView
- Agent 2C: WeekView + DayView

### Wave 3: Extract modals (2 agents parallel)
- Agent 3A: AddPlanModal + EditPlanModal + LogActualModal
- Agent 3B: ViewActualModal + DateEmployeesModal + ExportModal

### Wave 4: Orchestrator rewrite (1 agent)
- Rewrite WorkloadPage.tsx as ~120 line orchestrator
- Delete all extracted dead code
- Full regression verification
