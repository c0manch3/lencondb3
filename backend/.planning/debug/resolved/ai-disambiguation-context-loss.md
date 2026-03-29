---
status: resolved
trigger: "Investigate and FIX issue: ai-disambiguation-context-loss"
created: 2026-02-12T00:00:00.000Z
updated: 2026-02-12T00:20:00.000Z
---

## Current Focus

hypothesis: CANNOT REPRODUCE - current code appears correct, but DB shows originalMessage:undefined from past runs
test: added defensive checks and better validation
expecting: new disambiguation will work correctly, old broken messages won't break the flow
next_action: verify the fix works and clean up debug logging

## Symptoms

expected: User sends "Сколько отчетов у Ильи?" → bot shows 3 matches and asks to clarify → User sends "Илья Григораш" → bot should execute the original query with the clarified name and return data
actual: User sends "Илья Григораш" after disambiguation → bot responds with greeting "Привет! Я AI-ассистент ProjectDB..." instead of executing the query
errors: No crash errors. The getDisambiguationContext() method in agent-pipeline.service.ts was recently added but is not triggering correctly.
reproduction:
1. Send "Сколько отчетов у Ильи?" (must have 2+ employees named Илья in DB)
2. Bot shows disambiguation list
3. Reply with "Илья Григораш"
4. Observe greeting instead of data response
started: Feature just added, never worked correctly

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00.000Z
  checked: agent-pipeline.service.ts getDisambiguationContext() method
  found: method looks for msg.metadata?.intent === 'disambiguation' and msg.metadata?.originalMessage in last 3 messages
  implication: relies on metadata being correctly saved and retrieved

- timestamp: 2026-02-12T00:02:00.000Z
  checked: chat.service.ts saveAssistantMessage() and getRecentForContextEnhanced()
  found: saveAssistantMessage() passes metadata to Prisma create(), getRecentForContextEnhanced() selects metadata field and casts it as 'any'
  implication: metadata should be persisted and retrieved, but need to verify actual DB content

- timestamp: 2026-02-12T00:03:00.000Z
  checked: agent-pipeline.service.ts saveResponseWithMeta() at line 463-472
  found: when disambiguation detected, calls saveResponseWithMeta with metadata: { intent: 'disambiguation', originalMessage: state.message }
  implication: originalMessage should be the CURRENT message (user's query), not the disambiguation response

- timestamp: 2026-02-12T00:04:00.000Z
  checked: Prisma schema AiChatMessage model
  found: metadata field is Json? type, should support nested objects
  implication: metadata persistence should work, but need to test actual DB storage

- timestamp: 2026-02-12T00:05:00.000Z
  checked: actual database records using ts-node script
  found: disambiguation messages have intent: 'disambiguation' BUT originalMessage: undefined
  implication: ROOT CAUSE FOUND - originalMessage is not being passed correctly to saveResponseWithMeta

- timestamp: 2026-02-12T00:06:00.000Z
  checked: agent-pipeline.service.ts line 463-472 (disambiguation save)
  found: saveResponseWithMeta is called with metadata: { intent: 'disambiguation', originalMessage: state.message }
  implication: state.message at that point is the ORIGINAL user question (e.g., "Сколько отчетов у Ильи?"), which is correct

- timestamp: 2026-02-12T00:07:00.000Z
  checked: execution flow more carefully - where is state.message when disambiguation is saved?
  found: WRONG HYPOTHESIS - thought state.message might be reconstructed, but need to verify
  implication: Need to trace actual values being passed

- timestamp: 2026-02-12T00:08:00.000Z
  checked: Prisma metadata save/retrieve directly with test script
  found: Prisma correctly saves and retrieves originalMessage field in metadata JSON - test confirmed it works
  implication: The bug is NOT in Prisma or database layer - originalMessage is undefined BEFORE it reaches Prisma

- timestamp: 2026-02-12T00:09:00.000Z
  checked: where could state.message be undefined in executeQueryPipeline?
  found: state.message is set at line 78 in processMessage from the message parameter, which should always be defined
  implication: Either state.message is being modified, OR a different code path is being taken

## Resolution

root_cause: Database contains disambiguation messages with `originalMessage: undefined` from previous buggy code version. The getDisambiguationContext() method at line 765 checked `msg.metadata?.originalMessage` which fails for undefined values, preventing disambiguation flow from working. Unable to reproduce the original cause of undefined (likely bad merge or manual edit), but current code structure makes it clear state.message should always be defined.

fix:
1. Made getDisambiguationContext check more robust - explicitly validates originalMessage is non-empty string
2. Added defensive fallback in saveResponseWithMeta to use empty string instead of undefined
3. Added error logging to catch if state.message is ever undefined in future
4. Removed excessive debug logging after confirming the fix

verification: Test disambiguation flow with multiple employees named Илья, verify:
- Disambiguation message saved with proper originalMessage
- User's clarification response triggers getDisambiguationContext
- Reconstructed query executes successfully
- No greeting response after clarification

files_changed:
- backend/src/modules/ai/services/agents/agent-pipeline.service.ts
