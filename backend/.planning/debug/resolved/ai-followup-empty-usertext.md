---
status: resolved
trigger: "AI follow-up query 'Покажи текст этих отчетов' returns empty USERTEXT column despite finding 5 reports for Альбина"
created: 2026-02-12T12:00:00Z
updated: 2026-02-12T12:45:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: TypeScript compilation passes; regex tests pass for all key scenarios
expecting: Follow-up queries with contextual references now properly classified; LLM now guided to use distributions.description instead of userText
next_action: Archive session

## Symptoms

expected: Follow-up query "Покажи текст этих отчетов" should show userText content from previously found workloadActual records
actual: Table with USERTEXT column shown but all rows empty. Response says "К сожалению, текст отчетов отсутствует"
errors: No errors — data returns but field is empty
reproduction: 1) "Покажи последние 5 отчетов Альбины" -> 5 records with dates and hours 2) "Покажи текст этих отчетов" -> empty userText
started: First testing of follow-up queries after pipeline fixes

## Eliminated

- hypothesis: "Query pipeline drops userText field during formatting or summary"
  evidence: The formatAsTable method includes all non-object fields from query results. userText would be included if present.
  timestamp: 2026-02-12T12:15:00Z

- hypothesis: "LLM summary step strips userText from the response"
  evidence: The summary step receives raw JSON data including all fields. The issue is upstream - the data itself is null.
  timestamp: 2026-02-12T12:15:00Z

## Evidence

- timestamp: 2026-02-12T12:10:00Z
  checked: Prisma schema for WorkloadActual model
  found: userText field exists as String? (nullable) at line 211 of schema.prisma
  implication: Field exists in schema, need to check actual data

- timestamp: 2026-02-12T12:12:00Z
  checked: Direct Prisma query for ALL workloadActual records' userText field
  found: 880 total records, 0 have non-null userText. Every single record has userText=null
  implication: This is a DATA issue, not a code bug. The application never populates userText.

- timestamp: 2026-02-12T12:14:00Z
  checked: projectWorkloadDistribution.description for Альбина's records
  found: All distributions have meaningful descriptions like "8 часов (стремянки КМ1.2)", "11 часов"
  implication: The "report text" users expect is in distributions.description, NOT in workloadActual.userText

- timestamp: 2026-02-12T12:18:00Z
  checked: Coordinator intent classification for "Покажи текст этих отчетов"
  found: "покажи" matches QUESTION_ACTION_KEYWORDS and "отчетов" matches DATA_NOUNS -> isDbQueryCandidate=true at Priority 2, so it NEVER reaches Priority 3 (follow_up). The message is classified as a fresh db_query, not a follow-up.
  implication: The follow-up context (previous query, user filter, etc.) is lost. LLM builds a completely new query without knowing which user or records were being discussed.

- timestamp: 2026-02-12T12:20:00Z
  checked: Query builder system prompt for workloadActual queries
  found: Prompt includes rule "Для 'сколько отчётов' -> workloadActual.count" but NO rule about including distributions when asking for report text/details
  implication: LLM has no guidance to include distributions with descriptions when user asks for "текст отчетов"

- timestamp: 2026-02-12T12:22:00Z
  checked: Schema researcher model mapping for "текст" and "отчет"
  found: "отчет|отчёт" maps to ['workloadActual', 'projectWorkloadDistribution']. Both models are provided in pruned schema.
  implication: The LLM has access to both models' schema, but no explicit guidance that "текст отчетов" = distributions.description

- timestamp: 2026-02-12T12:35:00Z
  checked: Regex \b compatibility with Cyrillic in JavaScript
  found: \b does NOT work with Cyrillic characters. Used (?:^|\s) word boundaries instead. Tested all key patterns.
  implication: Pattern rewritten to use Cyrillic-safe word boundaries

- timestamp: 2026-02-12T12:40:00Z
  checked: TypeScript compilation after both fixes
  found: Clean build (npx tsc --noEmit and npx nest build both pass with zero errors)
  implication: Fixes are syntactically valid

## Resolution

root_cause: Two interrelated issues:
  1. DATA: workloadActual.userText is null for ALL 880 records in the database. The application never populates this field. The actual "report text" that users expect is stored in projectWorkloadDistribution.description (related model).
  2. CLASSIFICATION + GUIDANCE: "Покажи текст этих отчетов" is classified as db_query (not follow_up) because it matches isDbQueryCandidate, bypassing follow_up detection. Even when it goes through the query pipeline, the LLM has no guidance that "текст отчетов" means distributions.description, not workloadActual.userText.

fix: Two changes applied:
  1. coordinator.agent.ts: Added CONTEXTUAL_REFERENCE_PATTERNS to detect pronouns like "этих", "тех", "их" etc. that reference previous results. Added Priority 2a check: when contextual references are detected AND previous query context exists, classify as follow_up before checking db_query. Also added contextual references as a valid follow-up signal in detectFollowUp.
  2. query-builder.agent.ts: Added domain knowledge hint in system prompt: "workloadActual.userText обычно пустое (null). Текст/описание отчётов хранится в связанной модели projectWorkloadDistribution.description" — guides LLM to use include: { distributions: { include: { project: true } } }.

verification: TypeScript compilation passes. Regex patterns tested for correctness: all target phrases match, no false positives for normal queries.

files_changed:
  - src/modules/ai/services/agents/coordinator.agent.ts
  - src/modules/ai/services/agents/query-builder.agent.ts
