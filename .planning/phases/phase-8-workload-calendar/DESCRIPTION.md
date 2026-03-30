# Phase 8: Workload Calendar — Report Counts & Date Distribution Modal

## Goal
Restore missing workload calendar functionality from the old project: aggregate counts in calendar cells and detailed "Work Distribution" modal on cell click.

## Problem
Current MonthView shows individual plan/actual chips (initials + hours) but lacks:
1. Aggregate report/plan counts per day (the blue/green numbers from old project)
2. Detailed "Распределение работ" modal when clicking a cell body
3. Date-aware display logic (past → actuals, future → plans)

## Changes

### 1. MonthView: Aggregate Counts in Calendar Cells
**File:** `frontend/src/features/workload/components/MonthView.tsx`

When in "All Employees" mode (no specific employee/project filter):
- **Past & today dates**: Show blue number + "отчётов/отчёт" (actual report count from all employees)
- **Future dates**: Show green number + "планов/план" (plan count from all employees)
- When filtered to single employee or project: keep current chip behavior (initials + hours)

Pluralization rules (Russian):
- 1 → "отчёт" / "план"
- 2-4 → "отчёта" / "плана"
- 5-20 → "отчётов" / "планов"
- 21 → "отчёт", 22-24 → "отчёта", etc.

### 2. WeekView: Same Count Logic
**File:** `frontend/src/features/workload/components/WeekView.tsx`

Apply same aggregate count display in "All Employees" mode.

### 3. Cell Click → "Распределение работ" Modal
**File:** `frontend/src/features/workload/components/DateEmployeesModal.tsx`

Enhance existing DateEmployeesModal to match old project's detailed view:

For each employee on the selected date:
```
┌─────────────────────────────────────────────────┐
│ [Employee Name]                                  │
│                                                  │
│ Всего часов:                          8 Часов   │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ IF plan exists:                             │ │
│ │   Планируемый проект: [Project Name]        │ │
│ │ ELSE:                                       │ │
│ │   План на этот день отсутствует             │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Распределение по проектам:                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Project Name]                    N Часов   │ │
│ │ [Description text]                          │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4. Date-Aware Display Logic
**Files:** MonthView, WeekView, DateEmployeesModal

- Future dates (tomorrow+): show PLANS count and plan data in modal
- Past dates (before today): show ACTUALS/reports count and actual data in modal
- Today: show both (actuals if logged, plans if not)

### 5. Backend: Endpoint for All Actuals by Date Range
**File:** `backend/src/modules/workload-actual/workload-actual.controller.ts`

Verify that `GET /workload-actual?startDate=...&endDate=...` returns ALL employees' actuals (not just current user's). This endpoint already exists — just need to confirm it works for admin/manager roles and includes user info + distributions.

### 6. Data Fetching Enhancement
**File:** `frontend/src/features/workload/hooks/useWorkloadData.ts`

When user is Admin/Manager (canViewAllEmployees), fetch ALL employees' actuals for the calendar range — not just the current user's. This data is needed for:
- Aggregate counts in calendar cells
- DateEmployeesModal content

### 7. i18n Keys
**Files:** `frontend/src/i18n/locales/{en,ru}/translation.json`

Add missing keys:
```json
{
  "workload": {
    "report": "report",
    "reports": "reports",
    "plan": "plan",
    "plans": "plans",
    "workDistributionFor": "Work Distribution for {{date}}",
    "totalHours": "Total hours",
    "plannedProject": "Planned project",
    "noPlanForDate": "No plan for this date",
    "projectDistribution": "Distribution by projects",
    "employeeCount": "Employees: {{count}}"
  }
}
```

Russian:
```json
{
  "workload": {
    "report_one": "отчёт",
    "report_few": "отчёта",
    "report_many": "отчётов",
    "plan_one": "план",
    "plan_few": "плана",
    "plan_many": "планов",
    "workDistributionFor": "Распределение работ на {{date}}",
    "totalHours": "Всего часов",
    "plannedProject": "Планируемый проект",
    "noPlanForDate": "План на этот день отсутствует",
    "projectDistribution": "Распределение по проектам",
    "employeeCount": "Сотрудников: {{count}}"
  }
}
```

## Files to Modify
- `frontend/src/features/workload/components/MonthView.tsx` — aggregate counts
- `frontend/src/features/workload/components/WeekView.tsx` — aggregate counts
- `frontend/src/features/workload/components/DateEmployeesModal.tsx` — full redesign
- `frontend/src/features/workload/hooks/useWorkloadData.ts` — fetch all actuals
- `frontend/src/features/workload/WorkloadPage.tsx` — pass new props, handle cell click
- `frontend/src/features/workload/types.ts` — add types if needed
- `frontend/src/i18n/locales/en/translation.json` — new keys
- `frontend/src/i18n/locales/ru/translation.json` — new keys

## Design Notes
- Report count numbers: `text-blue-600 font-bold text-lg` (match old project)
- Plan count numbers: `text-green-600 font-bold text-lg` (match old project)
- Count label text: `text-xs text-gray-500`
- Modal cards: cream/tan borders matching current palette
- Plan box: light tan background
- Distribution items: bordered cards with project name bold + hours right-aligned
