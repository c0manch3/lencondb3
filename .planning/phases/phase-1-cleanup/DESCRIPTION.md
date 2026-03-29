# Phase 1: Cleanup & Feature Removal

## Goal
Copy projectdb2 into lencondb3 and remove all unnecessary modules, leaving a clean, buildable codebase.

## Scope

### Backend (NestJS)
- Remove module: `ai/` (chat, config, agents, logs, knowledge base)
- Remove module: `document/` (upload, versioning, storage)
- Remove module: `construction/` (structures in projects)
- Remove from `app.module.ts` all references to removed modules
- Remove related Prisma models: `AiConfig`, `AiQueryLog`, `AiKnowledge`, `AiChatMessage`, `Document`, `Construction`
- Keep `LenconnectChatLog` model (used by Telegram bot)
- Clean up `package.json` — remove: `openai`, `@anthropic-ai/sdk`, `multer`, `@types/multer`

### Frontend (React)
- Remove: `components/chat/` (ChatPanel, ChatMessages, ChatInput, ChatBubble, ChatFAB, data cards)
- Remove: `pages/AiConfigPage.tsx`
- Remove: Document upload UI from `ProjectDetailPage.tsx`
- Remove: Construction-related UI
- Remove: `hooks/useChat.ts`, `useChatHistory.ts`, `useChatStream.ts`
- Remove: `store/chatSlice.ts`, `services/chat.service.ts`
- Clean `App.tsx` routes for removed pages
- Clean `package.json` — remove: `socket.io-client` (if only used by chat)

### Validation
- Project builds without errors (`npm run build` both frontend and backend)
- All remaining routes work
- No dead imports or references to removed modules

## Waves (parallelizable)
- **Wave 1:** Backend module removal (AI, Document, Construction — 3 agents parallel)
- **Wave 2:** Frontend cleanup (Chat UI, Document UI, Construction UI — 3 agents parallel)
- **Wave 3:** Dependency cleanup + build verification (1 agent)
