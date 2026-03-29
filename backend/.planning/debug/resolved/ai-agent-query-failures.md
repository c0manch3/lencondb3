---
status: resolved
trigger: "AI agent cannot execute data queries. Two failure scenarios: 1) disambiguation works but follow-up 'Илья Григораш' returns 'Не удалось получить данные' 2) Direct query 'Покажи 5 последних отчетов Альбины' also fails"
created: 2026-02-12T10:00:00Z
updated: 2026-02-12T10:25:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: Live API tests for both scenarios
expecting: Both queries return data
next_action: Archive session

## Symptoms

expected: After disambiguation clarification or direct named query, AI should execute SQL and show data
actual: Response "Не удалось получить данные. Попробуйте переформулировать вопрос." in both cases
errors: No visible UI errors, just the error message from the assistant
reproduction:
  1. Ask "Сколько отчетов у Ильи?" -> disambiguation correct -> answer "Илья Григораш" -> FAIL
  2. Ask "Покажи 5 последних отчетов Альбины" -> FAIL
started: First real testing after phases 07 and 07.1 implementation

## Eliminated

- hypothesis: LLM/provider connection issues
  evidence: LLM calls succeed - query JSON is extracted and parsed
  timestamp: 2026-02-12T10:08:00Z

- hypothesis: Quality evaluator blocks queries
  evidence: Pre-validation passes (status: "executing" is yielded 3 times)
  timestamp: 2026-02-12T10:09:00Z

- hypothesis: Schema researcher gives wrong models
  evidence: workloadActual is correctly identified for "отчеты" queries
  timestamp: 2026-02-12T10:10:00Z

## Evidence

- timestamp: 2026-02-12T10:03:00Z
  checked: All pipeline source files read
  found: Controller uses AgentPipelineService (new pipeline), not ChatAgentService (old)
  implication: The new multi-agent pipeline is the active path

- timestamp: 2026-02-12T10:04:00Z
  checked: Error message source
  found: "Не удалось получить данные. Попробуйте переформулировать вопрос." comes from handleQueryError() in agent-pipeline.service.ts line 722
  implication: The executeQueryPipeline is being entered but failing after MAX_RETRIES

- timestamp: 2026-02-12T10:05:00Z
  checked: Schema researcher patterns for "отчеты"
  found: Pattern /отчет|отчёт|report|.../ maps to models ['workloadActual', 'projectWorkloadDistribution'].
  implication: Research correctly identifies relevant models

- timestamp: 2026-02-12T10:07:00Z
  checked: Word boundary (\b) with Cyrillic characters
  found: \b does NOT work with Cyrillic in JS regex. Personal name pattern never matches.
  implication: Secondary bug - doesn't cause main failure but should be fixed

- timestamp: 2026-02-12T10:10:00Z
  checked: Live API test with curl
  found: Response shows 3 "executing" status messages then error
  implication: Query passes pre-validation but fails at actual execution 3 times

- timestamp: 2026-02-12T10:12:00Z
  checked: Database aiChatMessage metadata for failed queries
  found: Error is "Model 'WorkloadActual' is not available. Available models: user, company, project, construction, document, workloadPlan, workloadActual..."
  implication: ROOT CAUSE - LLM outputs PascalCase, QueryValidatorService expects camelCase

- timestamp: 2026-02-12T10:13:00Z
  checked: SchemaRegistryService.getPrunedSchema() output
  found: Returns schema blocks with PascalCase names (model WorkloadActual { ... })
  implication: LLM sees PascalCase in prompt and reproduces it

- timestamp: 2026-02-12T10:14:00Z
  checked: Direct Prisma query test
  found: prisma.workloadActual.findMany with user filter works correctly
  implication: Database and Prisma work fine, issue is model name casing

- timestamp: 2026-02-12T10:22:00Z
  checked: Live API test AFTER fix - "Покажи 5 последних отчетов Альбины"
  found: Returns data successfully with structured_data and text_delta containing 5 reports
  implication: Fix works for direct queries

- timestamp: 2026-02-12T10:24:00Z
  checked: Live API test AFTER fix - full disambiguation flow
  found: Step 1: "Сколько отчетов у Ильи?" shows 3 matches. Step 2: "Илья Григораш" returns "У Ильи Григораша 43 отчета."
  implication: Fix works for disambiguation flow too

## Resolution

root_cause: THREE related bugs, all manifesting as "Не удалось получить данные":

1. **PRIMARY: Model name casing mismatch** - The LLM generates PascalCase model names (e.g., "WorkloadActual") because the pruned schema in its prompt uses PascalCase (from Prisma schema). But QueryValidatorService.executeReadonlyQuery() did a case-sensitive check against AVAILABLE_MODELS which only contained camelCase names (e.g., "workloadActual"). After 3 retry attempts with the same error, the pipeline returned the user-facing error message.

2. **SECONDARY: \b word boundary bug with Cyrillic** - Multiple regex patterns used \b (ASCII word boundary) with Cyrillic text. In JavaScript, \b only recognizes ASCII word characters (\w = [a-zA-Z0-9_]), so it never matches boundaries around Cyrillic characters. This affected:
   - Schema researcher's personal name detection pattern (line 93)
   - Disambiguation name reconstruction pattern (line 766)

3. **SECURITY: Role filter bypass** - When model names were PascalCase, the buildRoleFilter() switch/case (which uses camelCase) would not match, falling through to the default case. For Manager/Employee roles, this could skip role-based data filtering.

fix:
1. QueryValidatorService: Added MODEL_NAME_MAP for case-insensitive model name lookup. PascalCase, camelCase, and lowercase all resolve to canonical camelCase.
2. AgentPipelineService: Added inline model name normalization (PascalCase -> camelCase) right after query build, before any downstream processing (role filter, quality check, execution).
3. SchemaResearcherAgent: Fixed personal name regex from /\b(у|для|от|про)\s+[А-ЯЁ][а-яё]+/ to /(?:^|\s)(у|для|от|про)\s+[а-яё]+/i.
4. AgentPipelineService: Fixed disambiguation reconstruction regex from /\b(у|для|от|про)\s+[А-ЯЁа-яё]+/i to /(?:^|\s)(у|для|от|про)\s+[А-ЯЁа-яё]+/i with proper leading space preservation.

verification:
- "Покажи 5 последних отчетов Альбины" -> returns 5 reports with dates and hours
- "Сколько отчетов у Ильи?" -> shows 3 Илья matches -> "Илья Григораш" -> "У Ильи Григораша 43 отчета"

files_changed:
- backend/src/modules/ai/services/query-validator.service.ts
- backend/src/modules/ai/services/agents/agent-pipeline.service.ts
- backend/src/modules/ai/services/agents/schema-researcher.agent.ts
