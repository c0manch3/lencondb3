---
status: fixing
trigger: "Complex AI queries (groupBy/aggregation) fail with catch-all error while simple queries work"
created: 2026-02-10T12:00:00Z
updated: 2026-02-10T12:10:00Z
---

## Current Focus

hypothesis: CONFIRMED — Multiple cascading issues prevent complex queries
test: TypeScript compilation passes, code review of all changes complete
expecting: Complex analytical queries (groupBy) will now work end-to-end
next_action: Verify TypeScript compilation and update debug file to resolved

## Symptoms

expected: AI returns structured project report counts (e.g., "Project A - 5 reports, Project B - 4 reports")
actual: "Не удалось получить данные. Попробуйте переформулировать вопрос." — catch-all error
errors: Generic pipeline error from catch block at line 224 of chat-agent.service.ts
reproduction: Ask AI "По каким проектам были отчеты? Напиши в порядке убывания по количеству отчетов"
started: Current pipeline limitation — only handles simple operations

## Eliminated

- hypothesis: QueryValidatorService rejects groupBy as an operation
  evidence: ALLOWED_OPERATIONS at line 10-17 of query-validator.service.ts DOES include 'groupBy'
  timestamp: 2026-02-10T12:01:00Z

## Evidence

- timestamp: 2026-02-10T12:01:00Z
  checked: QueryValidatorService ALLOWED_OPERATIONS
  found: groupBy IS in the allowed list
  implication: The operation whitelist is not the issue

- timestamp: 2026-02-10T12:01:00Z
  checked: DbQueryAction interface (chat-agent.service.ts)
  found: args type was { where?, select?, include?, take?, orderBy? } — missing 'by', '_count', '_sum', '_avg', '_min', '_max', 'having' needed for groupBy/aggregate
  implication: TypeScript interface was incomplete — LLM-generated groupBy args would not match the interface

- timestamp: 2026-02-10T12:01:00Z
  checked: Query validator executeReadonlyQuery — groupBy handling
  found: No sanitization or validation for groupBy args. Only count gets special handling. groupBy requires 'by' field but no validation exists. groupBy also doesn't support 'include'/'select' with relations but no stripping occurs.
  implication: Invalid args would be passed to Prisma and fail

- timestamp: 2026-02-10T12:01:00Z
  checked: Prompt system — analytical query examples
  found: Line 66 mentions groupBy is available, but ZERO examples showing how to use it. The LLM has no guidance on groupBy JSON structure, which model to use, or how to express analytical questions as groupBy queries.
  implication: LLM would either generate incorrect JSON or fall back to unsupported query structures

- timestamp: 2026-02-10T12:01:00Z
  checked: Result handling for groupBy in chat-agent
  found: groupBy results are treated the same as findMany (arrays of objects), but groupBy returns [{fieldName, _count}] without human-readable names. The summary LLM would see UUIDs instead of project/user names.
  implication: Even if groupBy worked, the output would be unusable for natural language summary

## Resolution

root_cause: Four cascading issues prevented complex analytical queries:
  1. DbQueryAction interface restricted args to only {where, select, include, take, orderBy} — missing all groupBy/aggregate fields (by, _count, _sum, _avg, _min, _max, having, skip)
  2. QueryValidatorService had no sanitization for groupBy args (no 'by' validation, no aggregation key whitelisting, no result limits) and no sanitization for aggregate args
  3. System prompt had zero examples of groupBy/aggregate queries — the LLM had no guidance on how to translate analytical business questions into groupBy JSON structures
  4. Result pipeline had no special handling for groupBy results — no enrichment of foreign key IDs to human-readable names, no differentiated summary instructions

fix: Four-part fix across three files:
  1. Expanded DbQueryAction interface to include all Prisma groupBy/aggregate fields
  2. Added sanitizeGroupByArgs() and sanitizeAggregateArgs() methods to QueryValidatorService with proper validation, whitelisting, and defaults
  3. Added 5 analytical query examples + operation selection rules to PromptBuilderService system prompt
  4. Added enrichGroupByResults() method to ChatAgentService that resolves foreign key IDs to names, plus differentiated result handling and summary instructions for groupBy

verification: TypeScript compilation passes (npx tsc --noEmit — clean)
files_changed:
  - backend/src/modules/ai/services/chat/chat-agent.service.ts
  - backend/src/modules/ai/services/query-validator.service.ts
  - backend/src/modules/ai/services/chat/prompt-builder.service.ts
