# Phase 1: Cleanup & Feature Removal — Detailed Plan

## Pre-requisites

Copy source project (`projectdb2`) into target (`lencondb3`): `backend/`, `frontend/`, config files. NOT `.git`, `.planning`, `research/`.

---

## WAVE 1: Backend Module Removal (3 parallel agents)

### Agent 1A: Remove AI Module

**DELETE entire directory:**
- `backend/src/modules/ai/` (33 files)

**EDIT files:**

1. **`backend/src/app.module.ts`:**
   - Remove import: `import { AiModule } from './modules/ai/ai.module';`
   - Remove `AiModule` from imports array

2. **`backend/src/modules/users/users.service.ts`:**
   - Remove from user deletion transaction:
     ```
     await tx.aiQueryLog.deleteMany({ where: { userId: id } });
     await tx.aiKnowledge.deleteMany({ where: { createdById: id } });
     await tx.aiChatMessage.deleteMany({ where: { userId: id } });
     ```

3. **`backend/prisma/schema.prisma`:**
   - Remove enum: `AiProvider`
   - Remove models: `AiConfig`, `AiQueryLog`, `AiKnowledge`, `AiChatMessage`
   - From `User` model, remove relations: `aiQueryLogs`, `aiKnowledge`, `aiChatMessages`

---

### Agent 1B: Remove Document Module

**DELETE entire directory:**
- `backend/src/modules/document/` (3 files)

**EDIT files:**

1. **`backend/src/app.module.ts`:**
   - Remove import: `import { DocumentModule } from './modules/document/document.module';`
   - Remove `DocumentModule` from imports array

2. **`backend/prisma/schema.prisma`:**
   - Remove enum: `DocumentType`
   - Remove model: `Document`
   - From `Project` model: remove `contractDocumentId`, `contractDocument` relation, `documents` relation
   - From `Construction` model: remove `documents` relation
   - From `User` model: remove `uploadedDocuments` relation

3. **`backend/src/modules/project/project.service.ts`:**
   - `findAll()`: remove `documents: true` from `_count.select`
   - `findOne()`: remove `documents` include block and `documents: true` from `_count.select`

4. **`backend/src/modules/users/users.service.ts`:**
   - Remove document cleanup block from deletion transaction (steps 7-9)

---

### Agent 1C: Remove Construction Module

**DELETE entire directory:**
- `backend/src/modules/construction/` (4 files)

**EDIT files:**

1. **`backend/src/app.module.ts`:**
   - Remove import: `import { ConstructionModule } from './modules/construction/construction.module';`
   - Remove `ConstructionModule` from imports array

2. **`backend/prisma/schema.prisma`:**
   - Remove model: `Construction`
   - From `Project` model: remove `constructions` relation

3. **`backend/src/modules/project/project.service.ts`:**
   - `findAll()`: remove `constructions: true` from `_count.select`
   - `findOne()`: remove `constructions: true` from include and `_count.select`

### WAVE 1 COORDINATION
Agents 1A, 1B, 1C all modify: `app.module.ts`, `schema.prisma`, `project.service.ts`, `users.service.ts`.
**Strategy:** Serialize edits to shared files, or assign one agent to handle all shared file edits.

---

## WAVE 2: Frontend Cleanup (3 parallel agents)

### Agent 2A: Remove Chat UI

**DELETE:**
- `frontend/src/components/chat/` (10 files)
- `frontend/src/hooks/useChat.ts`
- `frontend/src/hooks/useChatHistory.ts`
- `frontend/src/hooks/useChatStream.ts`
- `frontend/src/store/slices/chatSlice.ts`
- `frontend/src/services/chat.service.ts`
- `frontend/src/pages/AiConfigPage.tsx`

**EDIT:**
1. **`MainLayout.tsx`:** Remove ChatPanel, ChatFAB imports and JSX
2. **`Header.tsx`:** Remove chat button and chatStore import
3. **`Sidebar.tsx`:** Remove aiConfig navigation item
4. **`App.tsx`:** Remove AiConfigPage import and route
5. **i18n files (en + ru):** Remove `navigation.aiConfig` and `aiConfig` sections

---

### Agent 2B: Remove Document UI

**EDIT:**
1. **`ProjectDetailPage.tsx`:**
   - Remove Document interface, document state variables, document handlers
   - Remove `'documents'` from TabType and validTabs
   - Remove documents tab content block (~120 lines)
   - Remove Upload/Replace Document modals (~130 lines)
2. **`ProjectsPage.tsx`:** Remove `documents` from `_count`
3. **`types/index.ts`:** Remove `contractDocumentId`, `DocumentType`, `Document` interface
4. **i18n files (en + ru):** Remove documents sections

---

### Agent 2C: Remove Construction UI

**DELETE:**
- `frontend/src/pages/ConstructionsPage.tsx` (dead file)

**EDIT:**
1. **`ProjectDetailPage.tsx`:**
   - Remove Construction interface, construction state/handlers
   - Remove `'constructions'` from TabType and validTabs
   - Remove constructions tab content block
   - Remove Add/Edit Construction modals
2. **`App.tsx`:** Remove constructions redirect route
3. **`ProjectsPage.tsx`:** Remove `constructions` from `_count`
4. **`types/index.ts`:** Remove `Construction` interface
5. **i18n files (en + ru):** Remove constructions sections
6. **Update `deleteConfirmWarning`** text (currently mentions "constructions and documents")

### WAVE 2 COORDINATION
Agents 2B and 2C both edit: `ProjectDetailPage.tsx`, `types/index.ts`, `ProjectsPage.tsx`, i18n files.
**Strategy:** Serialize 2B then 2C on shared files, or assign one agent for both.

---

## WAVE 3: Dependency Cleanup + Build Verification (1 agent)

### Backend package.json
**Remove:**
- `openai` (AI module only)
- `@anthropic-ai/sdk` (AI module only)
- `@nestjs/platform-socket.io` (never imported)
- `@nestjs/websockets` (never imported)
- `@nestjs/throttler` (never imported, was AI-related)

**DO NOT remove:**
- `multer` — used by expense controller for Excel import!
- `@types/multer` — needed for Express.Multer.File type

### Frontend package.json
**Remove:**
- `socket.io-client` (never imported)
- `@microsoft/fetch-event-source` (only used by deleted useChatStream.ts)

### Rebuild
```bash
cd backend && npm install && npx prisma generate && npm run build
cd frontend && npm install && npm run build
```

### Verify no dead references
```bash
grep -r "ai/\|/chat/\|/document/\|/construction/" frontend/src/ backend/src/ --include="*.ts" --include="*.tsx"
```

---

## Cross-Dependencies Found

1. **project.service.ts** includes constructions/documents in Prisma queries — MUST remove
2. **users.service.ts** cascading delete references AI + Document models — MUST remove
3. **contractDocumentId on Project** — field + relation must be removed from schema
4. **multer must NOT be removed** — expense controller uses it for Excel import
5. **ChatLogsPage** uses lenconnect_chat_log (Telegram bot), NOT AI chat — see open question
6. **ProjectDetailPage is 1708 lines** — removing constructions + documents = ~600 lines removed

---

## Resolved Questions

1. **ChatLogsPage** → УДАЛИТЬ. Страницу и импорт убираем.
2. **Старые таблицы при миграции** → НЕ ПЕРЕНОСИТЬ. Просто не включаем в скрипт миграции.
3. **uploads/** → НЕ КОПИРОВАТЬ в новый проект.
4. **deleteConfirmWarning** → Заменить на: "All workload data, payments and expenses associated with this project will be permanently deleted"
5. **multer** → НЕ удалять (используется расходами для импорта Excel)

---

## File Operation Summary

| Operation | Backend | Frontend | Total |
|-----------|---------|----------|-------|
| Directories to delete | 3 | 1 | 4 |
| Files to delete | 40 | 16 | 56 |
| Files to edit | 4 | 11 | 15 |
