---
status: resolved
trigger: "Analytical queries hang forever (infinite spinner). Simple queries work. After ANALYTICAL_KEYWORDS commits."
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T21:18:00Z
---

## Current Focus

RESOLVED - All fixes implemented and verified.

## Symptoms

expected: Analytical query should return data (which project has most hours)
actual: Infinite spinner (loading), response never comes
errors: No visible errors (silent generator exit)
reproduction: Ask "На какой проект затрачено больше всего рабочих часов сотрудников?" - hangs
started: After commits 85f4910, d76b1c2 (adding ANALYTICAL_KEYWORDS)

## Eliminated

- hypothesis: QueryValidatorService blocks groupBy/aggregate operations
  evidence: ALLOWED_OPERATIONS includes 'groupBy' and 'aggregate'
  timestamp: 2026-02-12T00:01:00Z

- hypothesis: autoEnrichQueryArgs adds include to groupBy queries breaking Prisma
  evidence: autoEnrichQueryArgs returns early for non-findMany operations (line 909)
  timestamp: 2026-02-12T00:01:00Z

- hypothesis: LLM API hangs for analytical queries
  evidence: Direct LLM API test returns in 1-2s. Trace logs confirm LLM calls complete in ~2s each
  timestamp: 2026-02-12T21:07:00Z

- hypothesis: Prisma groupBy doesn't work with relation filters
  evidence: Direct Prisma test confirms groupBy with relation where works fine (Prisma 6.19.1)
  timestamp: 2026-02-12T20:30:00Z

## Evidence

- timestamp: 2026-02-12T21:07:00Z
  checked: Full pipeline trace with console.log in dist/ JS
  found: All 3 retry attempts fail preCheck with "OrderBy field 'sum' does not exist"
  implication: LLM generates groupBy orderBy with aggregate keys but validator rejects them

- timestamp: 2026-02-12T21:07:00Z
  checked: Retry loop behavior when all preCheck retries exhausted
  found: For loop exits without any handler - generator ends silently
  implication: SSE stream closes with no response/done/error - frontend hangs

- timestamp: 2026-02-12T21:07:00Z
  checked: LLM-generated query structure
  found: LLM generates 'sum' (no underscore) instead of '_sum', and {hours:"hours"} instead of {hours:true}
  implication: Need normalization of LLM output to valid Prisma syntax

- timestamp: 2026-02-12T21:17:00Z
  checked: Verification after all fixes
  found: Analytical query "На какой проект затрачено больше всего часов?" returns "ПИК Токарево РД 9 корпус - 1095.75 часов"
  implication: All fixes working correctly

## Resolution

root_cause: THREE bugs combined: (1) SchemaRegistryService.validateOrderByFields rejected valid Prisma groupBy orderBy syntax - LLM generates aggregate keys like 'sum' without underscore prefix which failed validation. (2) executeQueryPipeline retry loop had no fallback when ALL attempts exhausted on preCheck.decision='retry' - the generator exited silently without yielding any response/done/error event, causing the SSE stream to close without informing the frontend (infinite spinner). (3) QueryValidatorService.sanitizeGroupByArgs only recognized aggregate keys with underscore prefix (_sum, _count) but LLM generates them without underscore (sum, count) and with wrong value format ({hours:"hours"} instead of {hours:true}).

fix: (1) SchemaRegistryService: Added AGGREGATE_ORDER_KEYS set to skip aggregate function names in validateOrderByFields and validateSelect. (2) AgentPipelineService: Added explicit error handling when preCheck retries exhaust (attempt === MAX_RETRIES), plus safety fallback after the for loop. (3) QueryValidatorService: Added AGGREGATION_KEY_ALIASES map to normalize LLM keys (sum->_sum), normalizeAggregationValue() to fix value formats, and fixGroupByOrderBy() to handle keys without underscore. (4) OpenAI/Anthropic providers: Added 30s timeout to prevent infinite hangs on API calls.

verification: Tested 4 scenarios post-fix: (1) Greeting - works (2) "На какой проект затрачено больше всего часов?" - returns "ПИК Токарево РД 9 корпус - 1095.75 часов" (3) "Сколько всего проектов?" - returns "45" (4) "Какой сотрудник работал больше всего часов?" - returns "Альбина Власова - 27 часов". All complete with proper done event.

files_changed:
- src/modules/ai/services/schema-registry.service.ts
- src/modules/ai/services/agents/agent-pipeline.service.ts
- src/modules/ai/services/query-validator.service.ts
- src/modules/ai/services/providers/openai.provider.ts
- src/modules/ai/services/providers/anthropic.provider.ts
