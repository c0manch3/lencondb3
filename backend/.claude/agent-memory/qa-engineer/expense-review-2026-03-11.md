# Expense Module Phase 2 Review - 2026-03-11

## Files Reviewed
- expense-io.service.ts (new)
- expense.controller.ts (modified)
- expense.module.ts (modified)
- expense.service.ts (modified, findAllForExport added)

## Critical Issues
1. No MIME-type validation on file upload (CWE-434)
2. No try/catch around XLSX.read -- 500 on invalid files (CWE-209)

## Major Issues
1. Silent skip of invalid VAT values instead of error
2. No validation of required column headers (Дата, Сумма, Категория)
3. findAllForExport has no record limit -- OOM risk
4. DRY violation: where-clause duplicated in findAll vs findAllForExport
5. Empty file returns 200 OK with {imported:0, errors:[]}

## Minor Issues
1. formatDate uses local timezone (getDate) instead of UTC (getUTCDate)
2. CurrentUser('id') vs CurrentUser('sub') inconsistency -- may break import
3. Float instead of Decimal for financial amounts
4. No row count limit for import
5. Export missing createdAt column
6. Content-Disposition doesn't support UTF-8 filenames

## Status: NOT READY for release until C-1, C-2, m-2 fixed
