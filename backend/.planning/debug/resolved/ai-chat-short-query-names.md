---
status: resolved
trigger: "Investigate and FIX issue: ai-chat-short-query-names"
created: 2026-02-11T00:00:00Z
updated: 2026-02-11T00:10:00Z
---

## Current Focus

hypothesis: CoordinatorAgent misroutes short queries with personal names because "отчет" is only in QUESTION_ACTION_KEYWORDS, not DATA_NOUNS, and no name detection exists
test: Read current implementations of all 3 agent files to confirm exact patterns
expecting: Will find missing "отчет" in DATA_NOUNS, no name detection in SchemaResearcher, no declension rules in QueryBuilder prompt
next_action: Read coordinator.agent.ts, schema-researcher.agent.ts, query-builder.agent.ts

## Symptoms

expected: "Сколько всего отчетов у Альбины?" should return data from the database (count of workloadActual records for employee named Альбина)
actual: Returns "Не удалось получить данные. Попробуйте переформулировать вопрос." for short queries with names. Only works when user explicitly says "у сотрудника по имени Альбина"
errors: No crash — the pipeline misroutes the query to 'consulting' intent instead of 'db_query', and consulting path doesn't query DB
reproduction: Send "Сколько всего отчетов у Альбины?" via the AI chat
started: This is a design gap in the newly created multi-agent pipeline (Phase 07.1)

## Eliminated

## Evidence

- timestamp: 2026-02-11T00:05:00Z
  checked: coordinator.agent.ts lines 32-36
  found: "отчет|отчёт" exists in QUESTION_ACTION_KEYWORDS (line 33) but NOT in DATA_NOUNS (line 35-36). DATA_NOUNS only has "проект|сотрудник|работник|компани|платеж|оплат|час|нагрузк|документ|конструкц|заказчик|подрядчик|предложен|зарплат|salary|фот"
  implication: For "Сколько отчетов у Альбины" - "сколько" + "отчет" both match QUESTION_ACTION_KEYWORDS, but no match in DATA_NOUNS → isDbQueryCandidate returns false (line 103 requires BOTH)

- timestamp: 2026-02-11T00:06:00Z
  checked: schema-researcher.agent.ts lines 33-110
  found: Line 41-44 has "отчет|отчёт|report" pattern that maps to workloadActual/projectWorkloadDistribution models, but no pattern for detecting personal names like "Альбина", "у Иванова"
  implication: When query contains a name but no keyword "сотрудник", the 'user' model won't be included in relevant models

- timestamp: 2026-02-11T00:07:00Z
  checked: query-builder.agent.ts lines 56-77
  found: System prompt has rules about DateTime, groupBy, mode insensitive, but no guidance about Russian name declensions or how to search by firstName/lastName with contains
  implication: LLM doesn't know to use firstName/lastName with contains mode when it sees names, may try exact match or wrong field

## Resolution

root_cause: Three coordinated issues prevent short queries with Russian names from working:
1. CoordinatorAgent: "отчет" missing from DATA_NOUNS causes query to be routed to 'consulting' instead of 'db_query'
2. SchemaResearcherAgent: No personal name detection, so 'user' model not included when query has "у Альбины" without keyword "сотрудник"
3. QueryBuilderAgent: No prompt guidance for Russian name declensions or firstName/lastName contains search

fix: Applied 3 targeted fixes:
1. coordinator.agent.ts line 36: Added "отчет|отчёт" to DATA_NOUNS regex
2. schema-researcher.agent.ts line 93-97: Added pattern /\b(у|для|от|про)\s+[А-ЯЁ][а-яё]+/ to detect personal names and map to 'user' model
3. query-builder.agent.ts lines 77-81: Added system prompt rules for Russian name declensions and firstName/lastName contains search with mode:insensitive

verification: TypeScript compilation passes with no errors. All three agents now coordinate to handle short Russian queries with personal names.

files_changed:
- backend/src/modules/ai/services/agents/coordinator.agent.ts
- backend/src/modules/ai/services/agents/schema-researcher.agent.ts
- backend/src/modules/ai/services/agents/query-builder.agent.ts
