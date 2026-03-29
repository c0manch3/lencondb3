---
status: verified
trigger: "Пользователь спрашивает 'На какой проект затрачено больше всего рабочих часов сотрудников?' — AI классифицирует как consulting вместо db_query"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: 22 test cases all pass (17 db_query, 5 non-db_query correctly classified)
expecting: N/A - verified
next_action: Archive and commit

## Symptoms

expected: AI should execute DB query (aggregate workload hours by project) and return real data
actual: AI responds with generic consulting text advice instead of querying the database
errors: No errors - wrong intent classification
reproduction: Ask "На какой проект затрачено больше всего рабочих часов сотрудников?"
started: Since AI assistant implementation

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:00:30Z
  checked: coordinator.agent.ts isDbQueryCandidate method
  found: Method requires BOTH hasQuestionKeyword AND hasDataNoun. For the test message, hasDataNoun=true (проект, час, сотрудник match), but hasQuestionKeyword=false because "какой" doesn't match "какие" in QUESTION_ACTION_KEYWORDS
  implication: ROOT CAUSE - the regex is too narrow. Missing question forms and analytical verbs.

- timestamp: 2026-02-12T00:00:45Z
  checked: Full list of missing keyword patterns
  found: Missing from QUESTION_ACTION_KEYWORDS: all forms of "какой" (only "какие" existed), "\b" used as word boundary which doesn't work with Cyrillic in JS. Missing entirely: analytical/aggregation keywords (больше всего, самый, наибольш, сравни, etc.)
  implication: Entire class of analytical/ranking/comparison questions falls through to consulting default

- timestamp: 2026-02-12T00:01:00Z
  checked: Pipeline support for aggregation (query-builder.agent.ts, agent-pipeline.service.ts)
  found: Pipeline ALREADY supports groupBy, aggregate, count operations. The ONLY issue is the coordinator failing to classify the intent correctly.
  implication: Fix is isolated to coordinator.agent.ts + minor schema-researcher improvement

- timestamp: 2026-02-12T00:02:00Z
  checked: schema-researcher.agent.ts hours pattern
  found: Pattern /часы|hours|отработ|переработ|сколько.*час|час.*работ/ fails to match "рабочих часов" because "часов" != "часы" and order is wrong for "час.*работ"
  implication: Schema researcher also needs broadened patterns for all hour forms

- timestamp: 2026-02-12T00:04:00Z
  checked: Comprehensive test (22 cases) after fix
  found: All 22 test cases pass. Original query correctly classified as db_query via question+noun path. Consulting messages still correctly fall through.
  implication: Fix is verified

## Resolution

root_cause: Two issues in CoordinatorAgent (coordinator.agent.ts):
  1. QUESTION_ACTION_KEYWORDS had "какие" but NOT "какой/какая/каком/какого/какому/каким/какую/каких" -- used "\b" word boundary which doesn't work with Cyrillic in JS
  2. No support for analytical/aggregation keywords at all -- questions with "больше всего", "самый", "наибольш", "сравни", "затрачен" etc. had no detection path

Additionally in SchemaResearcherAgent (schema-researcher.agent.ts):
  3. Hours pattern /часы|.../ failed to match "часов" (different declension form)
  4. No pattern to detect "project+hours" combination for projectWorkloadDistribution

fix: |
  coordinator.agent.ts:
  - Replaced "какие" with explicit forms: как(?:ой|ая|ое|ие|ого|ому|ом|им|ую|их)
  - Fixed \b word boundary to Cyrillic-safe (?=[^а-яёА-ЯЁ]|$) for "все" and "итог"
  - Added new ANALYTICAL_KEYWORDS regex with: больше всего/всех, меньше всего/всех, наибольш, наименьш, максимум, минимум, самый/самая/самое/самые, сравни, затрачен, потрачен, израсходован, распределен, общая сумма, итого, в сумме
  - Added Path 3 in isDbQueryCandidate: ANALYTICAL_KEYWORDS + DATA_NOUNS
  - Added work verbs to DATA_NOUNS: работал, работает, работают

  schema-researcher.agent.ts:
  - Expanded hours pattern to all declined forms: часы|часов|часа|часам|часах|часами + рабоч*час + затрачен*час
  - Added project+hours combination patterns for projectWorkloadDistribution: на как*проект*час, час*проект

verification: |
  - TypeScript compilation: clean (0 errors)
  - 22 test cases verified:
    17 db_query messages correctly classified (including original failing query)
    5 non-db_query messages correctly NOT classified
  - Original query "На какой проект затрачено больше всего рабочих часов сотрудников?" now classified as db_query via question+noun path (какой matches + проект/час/сотрудник match)
  - Schema researcher maps the query to projectWorkloadDistribution with groupBy operation
  - Consulting queries like "Как управлять проектами эффективно" still correctly fall through to consulting

files_changed:
  - backend/src/modules/ai/services/agents/coordinator.agent.ts
  - backend/src/modules/ai/services/agents/schema-researcher.agent.ts
