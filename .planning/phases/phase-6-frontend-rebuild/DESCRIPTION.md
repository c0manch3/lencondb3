# Phase 6: Complete Frontend Rebuild

## Goal
Delete the entire existing frontend and rebuild from scratch using the functional specification. Same backend API, completely new frontend code.

## Why
The current frontend was inherited from projectdb2, patched across 5 phases (cleanup, redesign, optimization, refactoring). A clean rebuild will produce more consistent, maintainable code without legacy patterns.

## Scope
- Delete `frontend/src/` entirely
- Rebuild all 13 pages + components from the functional spec
- Keep: package.json deps, vite.config.ts, tailwind.config.js, index.html, i18n translations, styles/index.css
- Must match 100% of existing functionality (see FUNCTIONAL_SPEC.md)
- Same API endpoints, same role-based access, same validation rules

## Functional Specification
See `FUNCTIONAL_SPEC.md` in this directory — comprehensive documentation of every feature, field, validation, API call, and role-based rule.
