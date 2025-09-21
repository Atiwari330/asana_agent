# Personal Context System - Implementation Plan

## Overview
This document outlines the implementation of a personal context system for the AI assistant, making it inherently aware of Adi's role as VP of Revenue Operations at Opus without requiring constant re-explanation.

## Prerequisites
Before starting implementation:
1. Ensure git is clean and all changes are committed
2. Verify you're on the main branch with latest changes
3. Create a new feature branch: `feature/personal-context-system`

## Context & Requirements

### User Background
- **User**: Adi Tiwari
- **Role**: VP of Revenue Operations & Player-Coach for Sales at Opus
- **Company**: Opus - EHR/CRM/RCM platform for behavioral health providers
- **Unique Aspect**: This is a single-user system, not multi-tenant. The AI should always know it's assisting Adi specifically.

### Key Requirements Established
1. **Always-On Context**: Personal context should be active in ALL modes (general chat, brainstorming, task creation)
2. **Invisible Injection**: Context loaded behind the scenes - user never sees it repeated
3. **Implicit Knowledge**: AI knows KPIs, stakeholders, etc. without over-explaining
4. **Smart Task Creation**: When converting brainstorms to tasks, AI uses judgment (1 task vs 6 based on context)
5. **No Assumptions**: When unclear about project/assignee, always ask
6. **Explicit Delegation**: Tasks only assigned when explicitly stated (no auto-assign to Gabriel)

### Design Decisions Made
- **File Format**: Markdown (easy to edit and maintain)
- **Injection Method**: Via system prompt (invisible to user)
- **Context Style**: Fully implicit - knows things without explaining why
- **Task Context**: Minimal - only what user specifies, no automatic KPI injection

## Implementation Architecture

### Three-Layer Context System

```
Layer 1: Personal Context (NEW - This Feature)
├── User's role, responsibilities, KPIs
├── Work style, delegation preferences
├── Company context (Opus specifics)
└── Key relationships & stakeholders

Layer 2: Operational Registry (EXISTING)
├── Projects & their contexts
├── People & aliases
└── Routing rules

Layer 3: Dynamic Context (RUNTIME)
├── Current conversation topic
├── Recent tasks created
└── Active brainstorming threads
```

## Files to Create/Modify

### 1. Create Personal Context File
**File**: `/config/adi-context.md`
**Purpose**: Store Adi's comprehensive context in markdown format
**Content Structure**:
```markdown
# Personal Context - Adi Tiwari

## Role & Title
- VP of Revenue Operations & Player-Coach for Sales
- Reports to: CEO (Humberto)
- Mission: Build repeatable, data-driven revenue system

## Company Context
- Company: Opus
- Product: EHR + CRM + RCM for behavioral health
- Competitors: SimplePractice, TherapyNotes, Tebra

## Teams & Key People
- Sales: Player-Coach (Adi)
- Right Hand: Gabriel (scheduling, follow-ups, proposals)
- Onboarding: Janelle Hall
- Support: John
- Marketing: Shawn
- Engineering: Hector

## Responsibilities
[Detailed breakdown by function]

## KPIs & Targets
[Specific metrics and goals]

## Current Challenges & Focus Areas
[Active priorities and pain points]

[Full context from XML provided by user]
```

### 2. Create Context Loader Module
**File**: `/lib/personal-context.ts`
**Purpose**: Load and parse the markdown context file
```typescript
// Similar pattern to asana-registry.ts
export interface PersonalContext {
  role: RoleInfo;
  company: CompanyInfo;
  teams: TeamMembers;
  responsibilities: ResponsibilityAreas;
  kpis: KPITargets;
  challenges: CurrentChallenges;
}

export function loadPersonalContext(): PersonalContext {
  // Load from /config/adi-context.md
  // Parse markdown into structured data
  // Cache for performance
  // Return parsed context
}
```

### 3. Update System Prompts
**File**: `/lib/ai/prompts.ts`
**Changes**:
```typescript
// Add new prompt that incorporates personal context
export const personalContextPrompt = `
You are an AI assistant specifically configured for Adi Tiwari,
VP of Revenue Operations at Opus. You have persistent knowledge
of his role, responsibilities, team structure, and goals.

[Context will be injected here]

Key behaviors:
- Use this context implicitly - don't explain why you know things
- When brainstorming, leverage knowledge of his priorities
- Convert brainstorm sessions to appropriate tasks using judgment
- Always ask when project/assignee is unclear
`;

// Modify systemPrompt to always include personal context
export const systemPrompt = ({...}) => {
  const personalContext = loadPersonalContext();
  // Combine with existing prompts
  // Ensure context is present for all modes
}
```

### 4. Wire Context Loading in Chat Route
**File**: `/app/(chat)/api/chat/route.ts`
**Changes**:
- Import personal context loader
- Ensure context is loaded at conversation start
- Pass to system prompt configuration

## Test Scenarios

### Scenario 1: Context-Aware Brainstorming
**Input**: "I want to improve our onboarding process"
**Expected**: AI understands Adi co-owns onboarding KPIs with Janelle, knows about 90% on-time go-live target, aware of RCM partner issues
**Verification**: Response references relevant context without being told

### Scenario 2: Brainstorm to Task Conversion
**Input**: After 30-message brainstorm, "create tasks for these ideas"
**Expected**: AI creates appropriate number of tasks based on discussion complexity
**Verification**: Tasks are well-scoped and assigned per explicit instructions

### Scenario 3: Project Disambiguation
**Input**: "Create a task about the pipeline review"
**Expected**: AI asks which project (could be RevOps personal or Sales-related)
**Verification**: No assumptions made, clear question asked

### Scenario 4: Implicit Knowledge Use
**Input**: General discussion about sales performance
**Expected**: AI knows close rate target is ≥15%, sales cycle target <120 days
**Verification**: Uses knowledge naturally without stating "according to your KPIs..."

## Implementation Steps

1. **Git Setup**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/personal-context-system
   ```

2. **Create Context File**
   - Copy full context from user-provided XML
   - Format as readable markdown
   - Organize into logical sections

3. **Build Context Loader**
   - Create TypeScript module
   - Implement markdown parsing
   - Add caching mechanism
   - Handle errors gracefully

4. **Update System Prompts**
   - Add personal context prompt
   - Modify main system prompt
   - Test injection works correctly

5. **Integration Testing**
   - Test all scenarios above
   - Verify context doesn't leak into UI
   - Ensure smooth transitions between modes

6. **Documentation**
   - Update CLAUDE.md with personal context info
   - Add section to README about single-user configuration
   - Document how to update context over time

## Success Criteria

✅ AI always knows who Adi is without being told
✅ Natural use of context in conversations
✅ Smart task creation based on discussion complexity
✅ No verbose over-explanation of context
✅ Seamless transition between chat and task modes
✅ Context updates are easy (just edit markdown file)

## Notes for Implementation

- The context file will be substantial (based on provided XML) - this is intentional
- Don't worry about token limits or optimization initially
- Focus on making the context fully available and useful
- User will handle updates to context as role evolves
- No need for sensitivity markers or learning/adaptation features
- Keep it simple and direct - implicit knowledge is the goal

## Next AI Agent Instructions

When you pick up this work:
1. First check git status and ensure clean working directory
2. Create the feature branch as specified
3. Start with creating the context file using the XML data provided in the original conversation
4. Build the loader module following the pattern from existing registry loader
5. Update prompts carefully to maintain existing functionality
6. Test thoroughly with the scenarios provided
7. Commit incrementally with clear messages

Remember: This is a single-user system for Adi specifically. The AI should act as his dedicated RevOps assistant who already knows everything about his role and company.