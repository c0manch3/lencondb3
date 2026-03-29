---
status: fixing
trigger: "AI reports show raw UUIDs and follow-up can't find report text"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - two root causes identified and fixed
test: TypeScript compilation passes, code review complete
expecting: Both issues resolved
next_action: Verify by running dev server and testing both scenarios

## Symptoms

expected:
  1. Reports shown WITHOUT raw UUIDs - only useful data (date, hours, text/description)
  2. Follow-up "show text" should return descriptions from distributions.description
actual:
  1. DATA_TABLE shows ID and USERID - useless UUIDs
  2. "Data not found. Report texts are absent."
errors: No errors - just wrong data
reproduction:
  1. "Покажи 5 последних отчетов Альбины" -> UUIDs visible
  2. "Покажи текст этих отчетов" -> empty
started: Since AI assistant implementation

## Eliminated

- hypothesis: LLM prompt hints to use distributions.description
  evidence: Added hints but LLM still doesn't use include for distributions
  timestamp: 2026-02-12

## Evidence

- timestamp: 2026-02-12T00:00:30Z
  checked: response-formatter.service.ts formatAsTable method (line 170-203)
  found: formatAsTable does Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object' || data[0][key] === null), then takes first MAX_TABLE_COLUMNS=5 keys. For workloadActual, the first keys will be id, userId, date, hoursWorked, userText - so id and userId (UUIDs) are shown
  implication: ROOT CAUSE #1 confirmed - no UUID filtering in formatAsTable

- timestamp: 2026-02-12T00:00:45Z
  checked: coordinator.agent.ts classify method (lines 72-86)
  found: "покажи текст этих отчетов" matches CONTEXTUAL_REFERENCE_PATTERNS ("этих") AND IMPERATIVE_DATA_START ("покажи"). Priority 2a checks follow_up first when contextual reference detected.
  implication: Message classified as follow_up, not db_query

- timestamp: 2026-02-12T00:00:50Z
  checked: agent-pipeline.service.ts handleFollowUp method (lines 306-408)
  found: handleFollowUp checks needsNewQuery, which includes isDbQueryCandidate(lowerMessage) matching "покажи". So needsNewQuery=true, falls through to DB query path. But the query builder doesn't include distributions.
  implication: Follow-up correctly routes to DB query, but LLM doesn't generate includes

- timestamp: 2026-02-12T00:01:00Z
  checked: Full follow-up flow for "покажи текст этих отчетов"
  found: Schema researcher includes both models (workloadActual + projectWorkloadDistribution), but LLM still generates query WITHOUT include for distributions despite prompt hints. Result has userText=null, no distributions data.
  implication: ROOT CAUSE #2 confirmed - LLM unreliable at generating includes; need code-level fix

- timestamp: 2026-02-12T00:03:00Z
  checked: TypeScript compilation after all fixes
  found: npx tsc --noEmit passes cleanly with zero errors
  implication: Fixes are syntactically correct and type-safe

## Resolution

root_cause: |
  1. formatAsTable (response-formatter.service.ts:170) shows ALL scalar fields from raw query results including id, userId (UUIDs). No UUID filtering, no model-specific formatting for workloadActual.
  2. When querying workloadActual, LLM doesn't reliably generate include:{distributions:true} even with prompt hints. userText is always null; actual report text lives in projectWorkloadDistribution.description. No code-level enrichment exists.

fix: |
  Two code-level fixes:

  FIX 1 (response-formatter.service.ts):
  - Added HIDDEN_FIELD_PATTERNS regex to exclude UUID/internal fields (id, userId, projectId, etc.) from data tables
  - Added COLUMN_LABELS mapping for human-readable Russian column headers
  - Added dedicated formatWorkloadActual() method that flattens nested distributions into readable columns: [Дата, Часы, Сотрудник, Описание]
  - Updated formatAsTable() to filter hidden fields and use Russian labels for all other models
  - formatWorkloadActual extracts descriptions from distributions.description with project name and hours context

  FIX 2 (agent-pipeline.service.ts):
  - Added autoEnrichQueryArgs() method that auto-injects include clauses for models requiring related data
  - For workloadActual findMany/findFirst: always includes distributions (with project name) and user (with firstName, lastName)
  - For projectWorkloadDistribution: always includes project and workloadActual.user
  - For paymentSchedule: always includes project name
  - Merge logic preserves any LLM-generated includes (doesn't overwrite)
  - Respects select queries (skips enrichment when LLM uses explicit select)
  - Only applies to record-returning operations (findMany/findFirst/findUnique), not count/groupBy/aggregate

verification: TypeScript compilation passes. Both fixes are code-level (not prompt-dependent) and deterministic.
files_changed:
  - src/modules/ai/services/chat/response-formatter.service.ts
  - src/modules/ai/services/agents/agent-pipeline.service.ts
