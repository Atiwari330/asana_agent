# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js AI chatbot application based on the Vercel AI Chatbot template, configured to use OpenAI GPT-5 models with Supabase (PostgreSQL) for data persistence and Redis for caching/resumable streams.

## Core Development Commands

```bash
# Development
pnpm dev              # Start development server with turbo (http://localhost:3000)
pnpm build           # Run migrations and build for production
pnpm start           # Start production server

# Database Management
pnpm db:push         # Push schema to database (quick setup, no migrations)
pnpm db:migrate      # Run database migrations
pnpm db:generate     # Generate migration files from schema changes
pnpm db:studio       # Open Drizzle Studio for database management
pnpm db:pull         # Pull schema from database

# Code Quality
pnpm lint            # Run Biome linter with fixes
pnpm lint:fix        # Run linter and formatter
pnpm format          # Format code with Biome

# Testing
pnpm test            # Run Playwright E2E tests
```

## Architecture Overview

### AI Provider Configuration (lib/ai/providers.ts)
The application uses a custom provider setup with OpenAI models:
- **chat-model**: GPT-5 for main chat interactions
- **chat-model-reasoning**: GPT-5 with reasoning middleware for chain-of-thought
- **title-model**: GPT-5-mini for generating chat titles
- **artifact-model**: GPT-5 for document/code generation

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL (Supabase)
- **Schema**: lib/db/schema.ts defines all tables (User, Chat, Message, Document, Suggestion, MessagePart)
- **Queries**: lib/db/queries.ts contains all database operations
- **Configuration**: drizzle.config.ts for Drizzle settings

### API Routes
- **Chat API**: app/(chat)/api/chat/route.ts - Main streaming chat endpoint using Vercel AI SDK's streamText
- **Authentication**: app/(auth) - NextAuth configuration with credentials provider
- **Actions**: app/(chat)/actions.ts - Server actions for chat operations

### UI Components Architecture
- **Chat Components**: components/chat-* - Main chat interface components
- **Artifacts**: components/artifact.tsx - Handles document/code display
- **Editor**: components/editor/ - Rich text editor with markdown support
- **UI Library**: components/ui/ - shadcn/ui components with Tailwind CSS

### Tool System
Located in lib/ai/tools/:
- **create-document**: Creates new artifacts (documents/code)
- **update-document**: Updates existing artifacts
- **get-weather**: Weather API integration
- **request-suggestions**: Generates follow-up suggestions

### Streaming Architecture
- Uses Vercel AI SDK's UIMessageStream with resumable streams (Redis-backed)
- Custom data types defined in lib/types.ts for artifact streaming
- Smooth streaming with word-level chunking

## Environment Configuration

Required environment variables (.env.local):
- `AUTH_SECRET`: Authentication secret for NextAuth
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 access
- `POSTGRES_URL`: Supabase PostgreSQL connection string
- `REDIS_URL`: Redis connection for caching/streams (optional but recommended)
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage for file uploads (optional)

## Key Technical Decisions

1. **OpenAI GPT-5**: Configured to use latest GPT-5 models via Vercel AI SDK
2. **Drizzle ORM**: Type-safe database operations with PostgreSQL
3. **Streaming UI**: Real-time streaming with artifact support
4. **NextAuth**: Session-based authentication with guest user support
5. **Biome**: Fast linter/formatter replacing ESLint/Prettier
6. **Tailwind CSS v4**: Latest Tailwind with CSS-in-JS approach
7. **React 19 RC**: Using React 19 release candidate features

## Development Workflow

When modifying AI behavior:
1. Check lib/ai/providers.ts for model configuration
2. Review lib/ai/prompts.ts for system prompts
3. Test with different model selections (chat-model vs chat-model-reasoning)

When adding new features:
1. Database changes go in lib/db/schema.ts, then run `pnpm db:generate` and `pnpm db:push`
2. New tools go in lib/ai/tools/ following existing patterns
3. UI components use shadcn/ui from components/ui/

When debugging:
1. Check Redis connection for streaming issues
2. Verify environment variables are properly set
3. Use `pnpm db:studio` to inspect database state