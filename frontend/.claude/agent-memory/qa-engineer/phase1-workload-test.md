---
name: Phase 1 Workload Actual Hours Test Results
description: Full test run of Phase 1 - employee logging actual work hours via workload calendar, all 9 tests passed
type: project
---

Phase 1 (actual hours logging for employees) tested 2026-03-24. All 9 test cases PASSED.

**Why:** Phase 1 restored the ability for employees to record actual worked hours through the main calendar on /workload, after the second calendar was disabled in Feature #342.

**How to apply:** If regression testing is needed for the workload page, these test cases cover the core Phase 1 acceptance criteria. The API endpoint pattern for actual hours uses startDate/endDate query params (not month/year). The /api/workload-actual/my endpoint without date range returns 500 -- this is a known backend issue to note.

Key findings:
- Auth: Employee role correctly gets 403 on /api/auth (user list) -- expected behavior, not a bug
- Button logic: past=green only, today=blue+green, future=blue only -- all correct
- Modal form defaults hours to 8, date is pre-filled and disabled
- View modal shows hours, notes, project distribution correctly
- DELETE /workload-actual/:id works for cleanup (HTTP 200)
- All 3 views (Day/Week/Month) display actual hours correctly
