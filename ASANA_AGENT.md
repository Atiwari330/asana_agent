# Asana Task Agent - Implementation Guide

## Overview
Building an AI agent using Vercel AI SDK that integrates with Asana to create tasks via natural language conversations. The agent operates in two distinct modes: general chat (default) and task creation (when explicitly requested).

## Current Status
- **Phase**: 1 (Single task creation)
- **Branch**: `feature/asana-task-agent` (TO BE CREATED)
- **Last Updated**: 2025-09-21

## Architecture Decisions

### Core Approach
- Using Vercel AI SDK's tool-calling pattern (not just simple functions)
- Server-side only Asana integration (security requirement)
- Strict allowlist via registry (no workspace-wide search)
- Single task per message (Phase 1 limitation)

### Key Components
1. **Registry** (`/config/opus-registry.json`) - Single source of truth for allowed projects/people
2. **Asana Client** (`/lib/asana.ts`) - Minimal API wrapper
3. **Create Task Tool** (`/lib/ai/tools/asana-create-task.ts`) - Tool definition with alias resolution
4. **System Prompt** (modified `/lib/ai/prompts.ts`) - Agent behavior control
5. **Chat Route** (modified `/app/(chat)/api/chat/route.ts`) - Tool registration

## Implementation Progress

### ✅ Completed
- [x] Registry file exists with real data (`/config/opus-registry.json`)
- [x] Documentation reviewed (AI SDK agents, tool calling, Asana API)
- [x] Feature branch creation (`feature/asana-task-agent`)
- [x] Asana API client implementation (`/lib/asana.ts`)
- [x] Tool implementation with alias resolution (`/lib/ai/tools/asana-create-task.ts`)
- [x] System prompt updates (`/lib/ai/prompts.ts`)
- [x] Chat route integration (`/app/(chat)/api/chat/route.ts`)

### 🚧 In Progress
- [ ] Commit and push changes

### 📋 TODO
- [ ] Test with real Asana workspace (manual testing required)
- [ ] Monitor for production issues
- [ ] Phase 2 features (multiple tasks, sections, custom fields)

## Technical Specifications

### Environment Variables
```env
ASANA_ACCESS_TOKEN=<personal_access_token>  # Required, already in .env.local
```

### Tool Schema (Zod)
```typescript
{
  project: z.string(),      // User input (aliases allowed)
  assignee: z.string(),     // User input (aliases allowed)
  title: z.string(),        // Clean, imperative title
  notes: z.string().optional(),  // Synthesized from ramble + context
  due_on: z.string().optional()  // YYYY-MM-DD format
}
```

### Asana API Fields (Canonical)
```typescript
{
  projects: [string],       // Array of project GIDs
  assignee: string,         // Email (Phase 1) or GID
  name: string,            // Task title
  notes: string,           // Task description
  due_on: string          // YYYY-MM-DD
}
```

## Agent Behavior

### Mode Detection Logic
1. **General Chat** (default) - No tool calls
2. **Task Creation** - Triggered by explicit phrases like "create a task", "add a task"

### Resolution Flow
1. Detect intent from user message
2. Extract candidates (project, assignee, title, notes, due date)
3. Resolve aliases using registry
4. Load project context (just-in-time)
5. Apply project rules and templates
6. Create task via Asana API
7. Return permalink confirmation

### Error Handling
- Unknown project/person: Ask ONE clarifying question
- Invalid assignee for project: Suggest valid assignees
- API failures: Return concise error + suggested fix
- Rate limits: Implement retry with backoff

## Registry Structure

### Current Data
- **People**: 3 entries (Adi, Janelle, Gabriel)
- **Projects**: 2 entries (Revenue Operations, Onboarding Leadership)
- **Policy**: ask on unknown, one task per message
- **Defaults**: 3 days due, Adi as default assignee

### Key Features Used
- Alias resolution (e.g., "me" → email)
- Project context injection
- Task guidance rules
- Conditional note appending

## Testing Scenarios

### Acceptance Tests
1. **Basic task**: "Create a task for Janelle in onboarding to confirm go-live by next Friday"
2. **Alias resolution**: "Create a task for me in rev ops to email leadership"
3. **Unknown project**: Should ask for clarification
4. **Date normalization**: "next Friday" → proper YYYY-MM-DD

## Temporary Solutions & Trade-offs

### Phase 1 Limitations
- **Single task only** - No bulk creation
- **Email-based assignment** - Not using Asana user GIDs yet
- **No sections** - Tasks go to default location
- **No custom fields** - Basic fields only
- **No templates** - Template data exists but unused

### Technical Debt
- [ ] Email → GID resolution could be cached
- [ ] Rate limit handling is basic (single retry)
- [ ] No workspace validation against actual Asana
- [ ] Context injection happens per-request (not cached)

## Future Phases (Out of Scope)

### Phase 2
- Multiple tasks per message
- Section placement
- Custom fields support
- Task templates

### Phase 3
- Task updates/comments
- Cross-project operations
- Workspace-wide search (if policy changes)
- OAuth flow for user auth

## Development Notes

### For New AI Agents/Sessions
1. Check this file first for current status
2. Review `/config/opus-registry.json` for data structure
3. Look at `/docs/asana_api_docs.md` for API specifics
4. Use existing AI SDK patterns from codebase
5. Maintain server-side security (never expose tokens)

### System Prompt Key Points
- Must emphasize mode separation
- Registry-only constraint is critical
- Date normalization to America/New_York
- One task per message enforcement
- Context injection per project

## Commands Reference

```bash
# Development
pnpm dev                    # Start dev server

# Testing
# Create test task via API
curl -X POST "http://localhost:3000/api/chat" ...

# Verify Asana token
curl -H "Authorization: Bearer $ASANA_ACCESS_TOKEN" \
  https://app.asana.com/api/1.0/users/me
```

## Related Files
- `/docs/` - AI SDK documentation
- `/config/opus-registry.json` - Registry configuration
- `/lib/ai/tools/` - Existing tool examples
- `/app/(chat)/api/chat/route.ts` - Main chat endpoint
- `/lib/ai/prompts.ts` - System prompts

---

**Last Agent**: Claude
**Session Context**: Building Phase 1 Asana Task Agent with registry-based allowlist